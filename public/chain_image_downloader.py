"""
Get the latest chainsUnique in view-source:https://defillama.com/chains
"""

import requests, os

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
}
# Assuming 'html_content' contains the HTML source you are parsing
chainsUnique = {
    chainObj["name"]
    for chainObj in requests.get(
        "https://api.llama.fi/v2/chains", headers=headers
    ).json()
}

for idx, chain in enumerate(chainsUnique):
    chain = chain.lower()
    print("progress:", idx / len(chainsUnique) * 100, "%")
    filepath = f"./chainPicturesWebp/{chain}.webp"
    if os.path.exists(filepath):
        print(f"Skipping {chain} as it already exists")
        continue
    img_data = requests.get(
        f"https://icons.llamao.fi/icons/chains/rsz_{chain}?w=48&h=48"
    ).content
    img_name = os.path.join("./", filepath)
    with open(img_name, "wb") as file:
        file.write(img_data)
