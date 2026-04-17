import json
import os

def create_autobattler_card_list():
    card_names_to_include = [
        "Huitzil Skywatch", "Glumvale Raven", "Rotten Carcass", "Leech-Ridden Corpse",
        "Impressible Cub", "Gore Swine", "Apprentice Lancer", "War-Clan Dowager",
        "Clairvoyant Koi", "Blistering Lunatic", "Dutiful Camel", "Lava-Moat Parapet",
        "Sparring Campaigner", "Soulsmoke Adept", "Lake Cave Lurker", "Faith in Darkness",
        "Scientific Inquiry", "To Battle", "By Blood and Venom", "Divination"
    ]

    all_cards_path = os.path.join('lists', 'all-cards.json')
    output_path = os.path.join('lists', 'autobattler-cards.json')

    try:
        with open(all_cards_path, 'r', encoding='utf-8-sig') as f:
            all_cards_data = json.load(f)
    except Exception as e:
        print(f"Error reading/parsing all-cards.json: {e}")
        return

    cards = all_cards_data.get('cards', [])
    
    # 1. Get the 20 requested cards
    final_cards = []
    for name in card_names_to_include:
        match = next((c for c in cards if c.get('card_name') == name and c.get('shape') != 'token'), None)
        if match:
            final_cards.append(match)
        else:
            print(f"Warning: Could not find base card {name}")

    # 2. Get exactly one 1/1 Construct token
    construct = next((c for c in cards if c.get('card_name') == 'Construct' and c.get('shape') == 'token' and c.get('pt') == '1/1'), None)
    if not construct:
        # Fallback to any construct token if 1/1 not found
        construct = next((c for c in cards if c.get('card_name') == 'Construct' and c.get('shape') == 'token'), None)
    
    if construct:
        final_cards.append(construct)
    else:
        print("Warning: Could not find a Construct token!")

    # 3. Add set-level image_type for consistency
    # (Just using a simple map for speed)
    set_img_types = {}
    for card in final_cards:
        s = card.get('set')
        if s not in set_img_types:
            set_file = os.path.join('sets', f'{s}-files', f'{s}.json')
            try:
                with open(set_file, 'r', encoding='utf-8-sig') as sf:
                    data = json.load(sf)
                    set_img_types[s] = data.get('image_type', 'jpg')
            except:
                set_img_types[s] = 'jpg'
        card['set_image_type'] = set_img_types[s]

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({"cards": final_cards}, f, indent=4)

    print(f"Successfully created {output_path} with {len(final_cards)} cards.")

if __name__ == '__main__':
    create_autobattler_card_list()
