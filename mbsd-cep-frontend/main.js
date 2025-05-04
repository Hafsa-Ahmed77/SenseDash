function updateClock() {
  const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const days = [
      'Sun', 'Mon', 'Tue', 'Wed',
      'Thurs', 'Fri', 'Sat'
  ];

  var currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = months[currentDate.getMonth()];
  const day = currentDate.getDate();
  let hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const seconds = currentDate.getSeconds();
  const dayOfWeek = days[currentDate.getDay()];

  const amPM = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12 || 12;

  // Add leading zero to minutes and seconds if they are less than 10
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

  document.getElementById('date').textContent = `${dayOfWeek}, ${day} ${month}, ${year}`;
  document.getElementById('time').textContent = `${hours}:${formattedMinutes}:${formattedSeconds} ${amPM}`;
}

document.addEventListener('DOMContentLoaded', function() {
  setInterval(updateClock, 1000);
  updateClock();
});
