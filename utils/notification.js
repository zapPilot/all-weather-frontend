const openNotificationWithIcon = (api, title, type, msg) => {
  api[type]({
    message: title,
    description: msg,
    showProgress: true,
    pauseOnHover: true,
    duration: 15000,
  });
};
export default openNotificationWithIcon;
