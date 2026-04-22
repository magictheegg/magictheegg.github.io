import json
import os

def create_autobattler_card_list():
    card_names_to_include = [
        "Huitzil Skywatch", "Glumvale Raven", "Rotten Carcass", "Intli Assaulter",
        "Impressible Cub", "Gore Swine", "Sanctuary Centaur", "War-Clan Dowager",
        "Clairvoyant Koi", "Blistering Lunatic", "Dutiful Camel", "Frontline Cavalier",
        "Sparring Campaigner", "Soulsmoke Adept", "Rakkiri Archer", "Lake Cave Lurker",
        "Faith in Darkness", "Scientific Inquiry", "To Battle", "By Blood and Venom", "Divination",
        "Exotic Game Hunter", "Cankerous Hog", "Shrieking Pusbag", "Executioner's Madness",
        "Earthrattle Xali", "Dynamic Wyvern", "Bristled Direbear", "Consult the Dewdrops",
        "Envoy of the Pure", "Centaur Wayfinder", "Warband Lieutenant", "Warrior's Ways",
        "Stratus Traveler", "Alluring Wisps", "Rapacious Sprite", "Up in Arms",
        "Mieng, Who Dances With Dragons", "Draconic Cinderlance", "Cabracan's Familiar", "Bushwhack",
        "Moonlight Stag", "Sleepless Spirit", "Silken Spinner", "Gnomish Skirmisher",
        "Siege Falcon", "Foresee", "Fight Song", "Edge of Their Seats",
        "Devil's Child", "Razorback Trenchrunner", "Sporegraft Slime", "Pungent Beetle", "Covetous Wechuge",
        "Finwing Drake", "Shrewd Parliament", "Pale Dillettante", "Aether Guzzler", "Dewdrop Oracle",
        "Arroyd Pass Shepherd", "Warband Rallier", "Cybres-Band Recruiter", "Cybres-Clan Squire", "Cybres-Band Lancer",
        "Windsong Apprentice", "Cauther Hellkite", "Vivid Griffin", "Nest Matriarch", "Lingering Lunatic",
        "Wilderkin Zealot", "Bellowing Giant", "Bwema, the Ruthless", "Silverhorn Tactician", "Scarhorn Cleaver",
        "Qinhana Cavalry", "Mekini Eremite", "Frontier Markswomen", "Dragonfist Axeman", "Festival Celebrants",
        "Suitor of Death", "Servants of Dydren", "Holtun-Band Elder", "Whispers of the Dead",
        "Ruin Skink", "Murkborn Mammoth", "Hissing Sunspitter", "Ceremony of Tribes",
        "Hero of a Lost War", "Hero of Hedria", "Holtun-Clan Eldhand", "Ghessian Memories",
        "Thunder Raptor", "Cloudline Sovereign", "Nightfall Raptor", "Triumphant Tactics",
        "Feral Exemplar", "Earthcore Elemental", "Ndengo Brutalizer", "Savage Congregation",
        "Pyrewright Trainee", "Lagoon Logistics", "Flaunt Luxury", "Artful Coercion",
        "Magnific Wilderkin", "Dwarven Phalanx", "Lair Recluse", "Tunnel Web Spider"
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
    
    final_cards = []
    tier_2_names = [
        "Exotic Game Hunter", "Cankerous Hog", "Shrieking Pusbag", "Executioner's Madness",
        "Earthrattle Xali", "Dynamic Wyvern", "Bristled Direbear", "Consult the Dewdrops",
        "Envoy of the Pure", "Centaur Wayfinder", "Warband Lieutenant", "Warrior's Ways",
        "Stratus Traveler", "Alluring Wisps", "Rapacious Sprite", "Up in Arms",
        "Mieng, Who Dances With Dragons", "Draconic Cinderlance", "Cabracan's Familiar", "Bushwhack",
        "Moonlight Stag", "Sleepless Spirit", "Silken Spinner", "Gnomish Skirmisher",
        "Siege Falcon", "Foresee", "Fight Song", "Edge of Their Seats", "Lake Cave Lurker"
    ]
    tier_3_names = [
        "Devil's Child", "Razorback Trenchrunner", "Sporegraft Slime", "Pungent Beetle", "Covetous Wechuge",
        "Finwing Drake", "Shrewd Parliament", "Pale Dillettante", "Aether Guzzler", "Dewdrop Oracle",
        "Arroyd Pass Shepherd", "Warband Rallier", "Cybres-Band Recruiter", "Cybres-Clan Squire", "Cybres-Band Lancer",
        "Windsong Apprentice", "Cauther Hellkite", "Vivid Griffin", "Nest Matriarch", "Lingering Lunatic",
        "Wilderkin Zealot", "Bellowing Giant", "Bwema, the Ruthless", "Silverhorn Tactician", "Scarhorn Cleaver",
        "Qinhana Cavalry", "Mekini Eremite", "Frontier Markswomen", "Dragonfist Axeman", "Festival Celebrants"
    ]
    tier_4_names = [
        "Suitor of Death", "Servants of Dydren", "Holtun-Band Elder", "Whispers of the Dead",
        "Ruin Skink", "Murkborn Mammoth", "Hissing Sunspitter", "Ceremony of Tribes",
        "Hero of a Lost War", "Hero of Hedria", "Holtun-Clan Eldhand", "Ghessian Memories",
        "Thunder Raptor", "Cloudline Sovereign", "Nightfall Raptor", "Triumphant Tactics",
        "Feral Exemplar", "Earthcore Elemental", "Ndengo Brutalizer", "Savage Congregation",
        "Pyrewright Trainee", "Lagoon Logistics", "Flaunt Luxury", "Artful Coercion",
        "Magnific Wilderkin", "Dwarven Phalanx", "Lair Recluse", "Tunnel Web Spider"
    ]

    for name in card_names_to_include:
        match = next((c for c in cards if c.get('card_name') == name and c.get('shape') != 'token'), None)
        if match:
            # Create a copy so we don't modify the source data multiple times if names repeat
            card_copy = dict(match)
            # Add tier information
            if name in tier_4_names:
                card_copy['tier'] = 4
            elif name in tier_3_names:
                card_copy['tier'] = 3
            elif name in tier_2_names:
                card_copy['tier'] = 2
            else:
                card_copy['tier'] = 1
            final_cards.append(card_copy)
        else:
            print(f"Warning: Could not find base card {name}")

    # Add required tokens
    token_names = [("Bird", "AEX"), ("Construct", "ACE"), ("Ox", "KOD"), ("Centaur Knight", "GSC")]
    for t_name, t_set in token_names:
        # For ACE Construct, we want specifically #58
        if t_name == "Construct" and t_set == "ACE":
            token = next((c for c in cards if c.get('card_name') == t_name and c.get('shape') == 'token' and c.get('set') == t_set and str(c.get('number')) == "58"), None)
        else:
            token = next((c for c in cards if c.get('card_name') == t_name and c.get('shape') == 'token' and c.get('set') == t_set), None)
        
        if token:
            final_cards.append(dict(token))

    # 2. Get exactly one 1/1 Construct token (ACE #58 for art)
    construct = next((c for c in cards if c.get('card_name') == 'Construct' and c.get('shape') == 'token' and str(c.get('number')) == "58" and c.get('set') == 'ACE'), None)
    if not construct:
        construct = next((c for c in cards if c.get('card_name') == 'Construct' and c.get('shape') == 'token' and c.get('pt') == '1/1'), None)
    if not construct:
        construct = next((c for c in cards if c.get('card_name') == 'Construct' and c.get('shape') == 'token'), None)
    
    if construct:
        final_cards.append(dict(construct))
    else:
        print("Warning: Could not find a Construct token!")

    # Add set-level image_type for consistency
    set_img_types = {}
    for card in final_cards:
        s = card.get('set')
        if s not in set_img_types:
            set_file = os.path.join('sets', f'{s}-files', f'{s}.json')
            if os.path.exists(set_file):
                try:
                    with open(set_file, 'r', encoding='utf-8-sig') as sf:
                        data = json.load(sf)
                        set_img_types[s] = data.get('image_type', 'jpg')
                except:
                    set_img_types[s] = 'jpg'
            else:
                set_img_types[s] = 'jpg'
        card['set_image_type'] = set_img_types[s]

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({"cards": final_cards}, f, indent=4)

    print(f"Successfully created {output_path} with {len(final_cards)} cards.")

if __name__ == '__main__':
    create_autobattler_card_list()
