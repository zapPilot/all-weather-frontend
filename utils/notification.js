const openNotificationWithIcon = (api, title, type, msg) => {
  api[type]({
    message: title,
    description: msg,
    showProgress: true,
    pauseOnHover: true,
  });
};
export default openNotificationWithIcon;
