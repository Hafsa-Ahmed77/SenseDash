#include <FirebaseESP32.h>
#include <WiFi.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <Update.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// ---------------- CONFIG ----------------
#define WIFI_SSID "ANSARI.FIBERNET(IRSHAD)"
#define WIFI_PASS "irshad561"

#define FW_VERSION_URL "https://temphumidity-69f02.web.app/version.txt"
#define FW_BINARY_URL "https://temphumidity-69f02.web.app/firmware.bin"
#define FIRMWARE_VERSION "1.0.2"

#define API_KEY "AIzaSyBGYw9AHqjASr32Coo_YgUx37zgX4HLBO4"
#define DATABASE_URL "https://temphumidity-69f02-default-rtdb.firebaseio.com/"
#define FIREBASE_AUTH "kK5t3vpPBn89fv4zlpJY3nRfkH14jLcC2ai6Xzqt"

FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// NTP client setup
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000);  // Default to UTC

unsigned long lastUpdate = 0;
const int MAX_RETRIES = 5;
void sendSensorData(float temp, float hum) {
  if (!Firebase.ready()) return;

  timeClient.update();
  unsigned long now = timeClient.getEpochTime();
  String timeString = timeClient.getFormattedTime();

  // Retry logic
  int retries = 0;
  bool success = false;
  while (retries < MAX_RETRIES && !success) {
    // Step 0: FIFO - Keep max 1500 readings (Limit data to last 100 records)
    if (Firebase.getJSON(firebaseData, "/sensor_history?limitToLast=20")) {  // Limit to last 100 records
      FirebaseJson& history = firebaseData.jsonObject();
      size_t count = history.iteratorBegin();
      
      if (count > 1500) {
        String oldestKey, dummy;
        int type;
        history.iteratorGet(0, type, oldestKey, dummy);
        Firebase.deleteNode(firebaseData, "/sensor_history/" + oldestKey);
        Serial.println("Deleted oldest reading (FIFO): " + oldestKey);
      }

      history.iteratorEnd();
    } else {
      Serial.println("Failed to fetch history (FIFO check): " + firebaseData.errorReason());
    }

    // Step 1: Delete entries older than 24 hours (Limit data to last 100 records)
    if (Firebase.getJSON(firebaseData, "/sensor_history?limitToLast=20")) {  // Limit to last 100 records
      FirebaseJson& history = firebaseData.jsonObject();
      size_t count = history.iteratorBegin();

      for (size_t i = 0; i < count; i++) {
        String key, value;
        int type;
        history.iteratorGet(i, type, key, value);

        FirebaseJson reading;
        reading.setJsonData(value);

        FirebaseJsonData tsData;
        reading.get(tsData, "timestamp");
        unsigned long ts = 0;
        if (tsData.type == "int") {
          ts = (unsigned long)tsData.intValue;
        } else if (tsData.type == "string") {
          ts = tsData.stringValue.toInt();
        }

        if (ts < now - 86400) { // 24 hours = 86400 seconds
          Serial.println("Deleting 24hr old reading: " + key);
          Firebase.deleteNode(firebaseData, "/sensor_history/" + key);
        }
      }

      history.iteratorEnd();
    } else {
      Serial.println("Failed to fetch history (24hr cleanup): " + firebaseData.errorReason());
    }

    // Step 2: Push new reading
    FirebaseJson json;
    json.set("temperature", temp);
    json.set("humidity", hum);
    json.set("timestamp", now);
    json.set("formatted_time", timeString);

    if (Firebase.pushJSON(firebaseData, "/sensor_history", json)) {
      Serial.println(F("Sensor data pushed to Firebase history."));
      Serial.println("New Reading Time: " + timeString);
      success = true;
    } else {
      retries++;
      Serial.print(F("Firebase Push Error: "));
      Serial.println(firebaseData.errorReason());
      Serial.print("Retrying... Attempt ");
      Serial.println(retries);
      delay(2000); // Wait before retrying
    }
  }

  if (!success) {
    Serial.println("Failed to push data after " + String(MAX_RETRIES) + " attempts.");
  }
}
void checkForUpdate() {
  HTTPClient http;
  http.begin(FW_VERSION_URL);
  int code = http.GET();

  if (code == 200) {
    String newVersion = http.getString();
    newVersion.trim();

    if (newVersion != FIRMWARE_VERSION) {
      Serial.println(F("New firmware available. Updating..."));
      http.end();

      http.begin(FW_BINARY_URL);
      int binCode = http.GET();

      if (binCode == 200) {
        int len = http.getSize();
        if (Update.begin(len)) {
          WiFiClient* stream = http.getStreamPtr();
          Update.writeStream(*stream);

          if (Update.end() && Update.isFinished()) {
            Serial.println(F("Update complete. Rebooting..."));
            ESP.restart();
          } else {
            Serial.println(F("Update failed."));
          }
        } else {
          Serial.println(F("Not enough space for OTA."));
        }
      } else {
        Serial.println(F("Binary download failed."));
      }
    } else {
      Serial.println(F("Already on latest firmware."));
    }
  } else {
    Serial.println(F("Version check failed."));
  }
  http.end();
}

void connectToWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  WiFi.setSleep(false);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print(F("IP: "));
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  Serial.print("Running Firmware Version: ");
  Serial.println(FIRMWARE_VERSION);
  dht.begin();
  delay(2000);
  Serial.println("Firmware version 1.0.2 running");

  connectToWiFi();

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println(F("Signed in anonymously."));
  } else {
    Serial.print(F("Firebase sign-in failed: "));
    Serial.println(config.signer.signupError.message.c_str());
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  timeClient.begin();
  checkForUpdate();
}

void loop() {
  if (millis() - lastUpdate > 60000) {  // 1 minute = 60,000 ms
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
      sendSensorData(t, h);
    } else {
      Serial.println(F("DHT read failed."));
    }

    lastUpdate = millis();
  }
}
