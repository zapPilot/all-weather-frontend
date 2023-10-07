export const sendDiscordMessage = async (content) => {
  fetch(process.env.NEXT_PUBLIC_DISCORD_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username: "Frontend", content }),
  }).catch((error) => {
    console.log(`Discord error: ${error}`);
  });
};
