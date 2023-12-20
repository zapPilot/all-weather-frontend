import { employerAddresses } from "./contractInteractions";
export const sendDiscordMessage = async (address, content) => {
  const lowerAddress = address.toLowerCase();
  if (employerAddresses.includes(lowerAddress)) {
    console.log("Employer address, not sending discord message");
    return;
  }
  const roleIdOfMod = "<@&1108070617753862156>";
  fetch(process.env.NEXT_PUBLIC_DISCORD_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "Frontend",
      content: roleIdOfMod + `: ${lowerAddress}` + content,
    }),
  }).catch((error) => {
    console.log(`Discord error: ${error}`);
  });
};
