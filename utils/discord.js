export const sendDiscordMessage = async (content) => {
  const roleIdOfMod = "<@&1108070617753862156>";
  fetch(process.env.NEXT_PUBLIC_DISCORD_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "Frontend",
      content: roleIdOfMod + ": " + content,
    }),
  }).catch((error) => {
    console.log(`Discord error: ${error}`);
  });
};
