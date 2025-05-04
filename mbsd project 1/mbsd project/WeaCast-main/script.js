// Selecting HTML Elements
const weather_element = document.getElementById("weather");
const temperature_main_element = document.getElementById("temperature-main");
const weather_description_element = document.getElementById("weather-description");
const weather_icon_element = document.getElementById("icon");
const temperature_element = document.getElementById("temperature");
const humidity_element = document.getElementById("humidity");
const wind_speed_element = document.getElementById("wind-speed");
const country_element = document.getElementById("country");
const town_element = document.getElementById("city");
// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBGYw9AHqjASr32Coo_YgUx37zgX4HLBO4",
    authDomain: "temphumidity-69f02.firebaseapp.com",
    databaseURL: "https://temphumidity-69f02-default-rtdb.firebaseio.com",
    projectId: "temphumidity-69f02",
    storageBucket: "temphumidity-69f02.appspot.com",
    messagingSenderId: "536202714043",
    appId: "1:536202714043:web:b6d687405b643be695429e",
    measurementId: "G-YSN92XPCST"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  
// OpenWeather API Key
const API_KEY = "ed503a5132885e938fcf0fe468520fcf";
function getLocationAndWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(fetchWeatherData, showError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Function to Fetch Weather Data Using Live Location
function fetchWeatherData(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    console.log(`User Location: Lat ${lat}, Lon ${lon}`);

    // OpenWeatherMap Reverse Geocoding API to Get Area Name
    const locationApiUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;

    fetch(locationApiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const area = data[0].name;
                console.log(`Detected Area: ${area}`);
                town_element.textContent = area; // Display Area Name

                // Fetch Weather Data for This Location
                getWeather(lat, lon, area);
            } else {
                console.error("Error: No location data found.");
                town_element.textContent = "Unknown Area";
            }
        })
        .catch(error => console.error("Error fetching location:", error));
}

// Function to Fetch Weather Data
function getWeather(lat, lon, area) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            console.log("Weather Data:", data);

            const weather = data.weather[0].main;
            const weather_description = data.weather[0].description;
            const weather_icon = data.weather[0].icon;
            // const temperature = data.main.temp;
            // const humidity = data.main.humidity;
            const country = data.sys.country;

            // Update UI
            weather_element.textContent = weather;
            country_element.textContent = country;
            weather_description_element.textContent = weather_description;
            weather_icon_element.src = `https://openweathermap.org/img/wn/${weather_icon}@2x.png`;

            // Set Background Based on Weather
            setWeatherBackground(weather);
        })
        .catch(error => console.error("Error fetching weather data:", error));
}

// Real-time Firebase data fetch
function getTemperatureHumidityFromFirebase() {
    const sensorRef = db.ref('/sensor_history');
  
    sensorRef.orderByKey().limitToLast(1).on('value', (snapshot) => {
      const data = snapshot.val();
  
      if (data) {
        const latestKey = Object.keys(data)[0];
        const latestEntry = data[latestKey];
  
        const temperature = latestEntry.temperature ?? "--";
        const humidity = latestEntry.humidity ?? "--";
        const time = latestEntry.formatted_time ?? "--";
  
        // Update UI
        temperature_main_element.textContent = `${temperature}°C`;
        temperature_element.textContent = `${temperature}°C`;
        humidity_element.textContent = `${humidity}%`;
  
        // Optional: show timestamp
        const timeElement = document.getElementById('sensor-time');
        if (timeElement) {
          timeElement.textContent = `Updated at ${time}`;
        }
  
        console.log("Latest Firebase Sensor Data:", latestEntry);
      } else {
        console.warn("No sensor data found in Firebase.");
      }
    });
  }
  

// Function to Handle Errors in Geolocation
function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied location access.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("The request to get location timed out.");
            break;
        default:
            alert("An unknown error occurred.");
            break;
    }
}

// Function to Set Background Based on Weather
function setWeatherBackground(weather) {
    const backgrounds = {
        "Clear": "url('./images/clear.gif')",
        "Clouds": "url('./images/clouds.gif')",
        "Rain": "url('./images/rain.gif')",
        "Snow": "url('./images/snow.gif')",
        "Fog": "url('./images/fog.gif')",
        "Thunderstorm": "url('./images/thunderstorm.gif')",
        "Haze": "url('./images/haze.gif')",
        "Mist": "url('./images/mist.gif')"
    };

    document.getElementById("background").style.backgroundImage = backgrounds[weather] || backgrounds["Clear"];
}
getLocationAndWeather();
getTemperatureHumidityFromFirebase();


