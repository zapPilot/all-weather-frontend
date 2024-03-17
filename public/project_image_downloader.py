"""
Use this script to download all the project images from defillama
"""
import requests, os

res = requests.get("https://yields.llama.fi/pools")
res_json = res.json()

downloaded_protocol = set()
for idx, protocol in enumerate(res_json["data"]):
    project = protocol["project"].lower()
    if project in downloaded_protocol:
        continue
    downloaded_protocol.add(project)
    print("progress:", idx / len(res_json["data"]) * 100, "%")
    filepath = f"./projectPictures/{project}.webp"
    if os.path.exists(filepath):
        print(f"Skipping {project} as it already exists")
        continue
    img_data = requests.get(
        f"https://icons.llamao.fi/icons/protocols/{project}?w=48&h=48"
    ).content
    img_name = os.path.join("./", filepath)
    with open(img_name, "wb") as file:
        file.write(img_data)
