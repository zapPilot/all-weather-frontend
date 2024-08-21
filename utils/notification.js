const openNotificationWithIcon = (api, type, msg) => {
  api[type]({
    message: "Transaction Result",
    description: msg,
    showProgress: true,
    pauseOnHover: true,
  });
};
export default openNotificationWithIcon;
