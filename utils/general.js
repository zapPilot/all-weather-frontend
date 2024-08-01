export function timeAgo(dateString) {
  console.log("dateString", dateString);
  // Parse the input date string
  const [datePart, timePart] = dateString.split(" ");
  const [month, day, year] = datePart.split("/");
  let [hours, minutes, seconds] = timePart.split(":");
  const date = new Date(year, month - 1, day, hours, minutes, seconds);

  // Get the current time
  const now = new Date();

  // Calculate the difference in milliseconds
  const diffInMs = now - date;

  // Convert milliseconds to various time units
  seconds = Math.floor(diffInMs / 1000);
  minutes = Math.floor(seconds / 60);
  hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  // Create a readable string
  let timeAgoString = "";

  if (years > 0) {
    timeAgoString = `${years} year${years > 1 ? "s" : ""}`;
  } else if (months > 0) {
    timeAgoString = `${months} month${months > 1 ? "s" : ""}`;
  } else if (weeks > 0) {
    timeAgoString = `${weeks} week${weeks > 1 ? "s" : ""}`;
  } else if (days > 0) {
    timeAgoString = `${days} day${days > 1 ? "s" : ""}`;
  } else if (hours > 0) {
    timeAgoString = `${hours} hour${hours > 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    timeAgoString = `${minutes} minute${minutes > 1 ? "s" : ""}`;
  } else {
    timeAgoString = `${seconds} second${seconds > 1 ? "s" : ""}`;
  }
  // Return the string with the timing part bold
  return timeAgoString;
}
