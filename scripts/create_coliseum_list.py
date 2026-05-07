import json
import os

def create_coliseum_card_list():
    card_names_to_include = [
        "Huitzil Skywatch", "Glumvale Raven", "Rotten Carcass", "Intli Assaulter",
        "Sanctuary Centaur", "War-Clan Dowager",
        "Clairvoyant Koi", "Blistering Lunatic", "Dutiful Camel", "Frontline Cavalier",
        "Sparring Campaigner", "Soulsmoke Adept", "Rakkiri Archer", "Lake Cave Lurker",
        "Faith in Darkness", "Scientific Inquiry", "To Battle", "Might and Mane", "Divination",
        "Exotic Game Hunter", "Shrieking Pusbag", "Executioner's Madness",
        "Earthrattle Xali", "Dynamic Wyvern", "Bristled Direbear", "Consult the Dewdrops",
        "Envoy of the Pure", "Centaur Wayfinder", "Warband Lieutenant", "Warrior's Ways",
        "Stratus Traveler", "Rapacious Sprite", "Up in Arms",
        "Cabracan's Familiar", "Way of the Bygone",
        "Moonlight Stag", "Silken Spinner", "Gnomish Skirmisher",
        "Foresee", "Fight Song", "Edge of Their Seats",
        "Razorback Trenchrunner", "Sporegraft Slime", "Covetous Wechuge",
        "Finwing Drake", "Shrewd Parliament", "Pale Dillettante", "Aether Guzzler", "Dewdrop Oracle",
        "Arroyd Pass Shepherd", "Warband Rallier", "Cybres-Band Recruiter", "Cybres-Clan Squire", "Cybres-Band Lancer",
        "Windsong Apprentice", "Cauther Hellkite", "Lingering Lunatic",
        "Bellowing Giant", "Bwema, the Ruthless", "Silverhorn Tactician",
        "Qinhana Cavalry", "Frontier Markswomen", "Festival Celebrants",
        "Restless Oppressor", "Striding Cascade", "Waspback Bandit",
        "Suitor of Death", "Servants of Dydren", "Holtun-Band Elder", "Whispers of the Dead",
        "Murkborn Mammoth", "Hissing Sunspitter", "Mirror Image",
        "Hero of a Lost War", "Hero of Hedria", "Ghessian Memories",
        "Thunder Raptor", "Cloudline Sovereign", "Nightfall Raptor", "Mekini Eremite",
        "Ndengo Brutalizer", "Savage Congregation",
        "Pyrewright Trainee", "Lagoon Logistics", "Yamamura the Wanderer", "Sunspear Angel",
        "Magnific Wilderkin", "Dwarven Phalanx", "Lair Recluse", "Tunnel Web Spider",
        "Song of Wind and Fire", "Decorated Warrior",
        "Dancing Mirrorblade", "Warhammer Kreg", "The Exile Queen's Crown",
        "Hero's Sledge", "Djitu's Lithified Mantle", "Ash-Withered Cloak",
        "Steel Barding", "Rivha's Blessed Blade", "Blacksteel Loadout",
        "Lumbering Ancient", "Zarax Supermajor", "Infuse the Apparatus",
        "Michal, the Anointed", "Ladria, Windwatcher", "Erin, Beacon of Humility",
        "Citadel Colossus", "Triumphant Tactics",
        "Battlefront Lancer", "Marbled Aakriti", "Scourge of the Sun",
        "Jiayin, the Harmonious", "Gallant Centaur", "Holtun-Band Emissary", "Nacreous Hydra",
        "Am'Atambi's Wildkin", "Pestilent Leopardfly", "Touch of the Omen", "Faceless Faction",
        "Duskborn Hunter", "Nightmare Harpy", "Sanguine Anaconda",
        "Dune Skirmisher", "Angora Paladin", "Small World", "Restless Migrants",
        "Jhalach Scourge", "Solemn Pilgrimage", "Aldmore Chaperone",
        "Bjarndyr Bruiser", "Gold Grubber", "Herd Matron",
        "Patron of the Meek", "Honor Begets Glory",
        "Unyielding Enforcer", "Thrice-Clawed Troika"
    ]

    all_cards_path = os.path.join('lists', 'all-cards.json')
    output_path = os.path.join('custom', 'lists', 'coliseum-cards.json')

    try:
        with open(all_cards_path, 'r', encoding='utf-8-sig') as f:
            all_cards_data = json.load(f)
    except Exception as e:
        print(f"Error reading/parsing all-cards.json: {e}")
        return

    cards = all_cards_data.get('cards', [])
    
    final_cards = []
    tier_2_names = [
        "Am'Atambi's Wildkin",
        "Angora Paladin",
        "Battlefront Lancer",
        "Bristled Direbear",
        "Cabracan's Familiar",
        "Centaur Wayfinder",
        "Consult the Dewdrops",
        "Dynamic Wyvern",
        "Earthrattle Xali",
        "Edge of Their Seats",
        "Envoy of the Pure",
        "Executioner's Madness",
        "Exotic Game Hunter",
        "Fight Song",
        "Foresee",
        "Gnomish Skirmisher",
        "Jhalach Scourge",
        "Lake Cave Lurker",
        "Marbled Aakriti",
        "Moonlight Stag",
        "Pestilent Leopardfly",
        "Rapacious Sprite",
        "Restless Migrants",
        "Scourge of the Sun",
        "Shrieking Pusbag",
        "Silken Spinner",
        "Small World",
        "Solemn Pilgrimage",
        "Stratus Traveler",
        "Touch of the Omen",
        "Up in Arms",
        "Warband Lieutenant",
        "Warband Rallier",
        "Warrior's Ways",
        "Way of the Bygone",
        "Yamamura the Wanderer"
    ]
    tier_3_names = [
        "Aether Guzzler",
        "Aldmore Chaperone",
        "Arroyd Pass Shepherd",
        "Bellowing Giant",
        "Bjarndyr Bruiser",
        "Sunspear Angel",
        "Bwema, the Ruthless",
        "Cauther Hellkite",
        "Covetous Wechuge",
        "Cybres-Band Lancer",
        "Cybres-Band Recruiter",
        "Cybres-Clan Squire",
        "Dewdrop Oracle",
        "Duskborn Hunter",
        "Faceless Faction",
        "Finwing Drake",
        "Frontier Markswomen",
        "Gallant Centaur",
        "Gold Grubber",
        "Herd Matron",
        "Hero of a Lost War",
        "Jiayin, the Harmonious",
        "Pale Dillettante",
        "Qinhana Cavalry",
        "Razorback Trenchrunner",
        "Restless Oppressor",
        "Silverhorn Tactician",
        "Sporegraft Slime",
        "Striding Cascade",
        "Windsong Apprentice"
    ]
    tier_4_names = [
        "Dwarven Phalanx",
        "Festival Celebrants",
        "Ghessian Memories",
        "Hero of Hedria",
        "Hissing Sunspitter",
        "Holtun-Band Elder",
        "Holtun-Band Emissary",
        "Honor Begets Glory",
        "Lagoon Logistics",
        "Lair Recluse",
        "Lingering Lunatic",
        "Magnific Wilderkin",
        "Mekini Eremite",
        "Michal, the Anointed",
        "Mirror Image",
        "Murkborn Mammoth",
        "Ndengo Brutalizer",
        "Nightfall Raptor",
        "Nightmare Harpy",
        "Patron of the Meek",
        "Pyrewright Trainee",
        "Sanguine Anaconda",
        "Savage Congregation",
        "Servants of Dydren",
        "Shrewd Parliament",
        "Song of Wind and Fire",
        "Thunder Raptor",
        "Tunnel Web Spider",
        "Waspback Bandit",
        "Whispers of the Dead"
    ]
    tier_5_names = [
        "Ash-Withered Cloak",
        "Blacksteel Loadout",
        "Citadel Colossus",
        "Cloudline Sovereign",
        "Dancing Mirrorblade",
        "Decorated Warrior",
        "Djitu's Lithified Mantle",
        "Erin, Beacon of Humility",
        "Hero's Sledge",
        "Infuse the Apparatus",
        "Ladria, Windwatcher",
        "Lumbering Ancient",
        "Nacreous Hydra",
        "Rivha's Blessed Blade",
        "Steel Barding",
        "Suitor of Death",
        "The Exile Queen's Crown",
        "Thrice-Clawed Troika",
        "Triumphant Tactics",
        "Unyielding Enforcer",
        "Warhammer Kreg",
        "Zarax Supermajor"
    ]

    for name in card_names_to_include:
        # Special case: prioritize specific sets if needed
        preferred_set = None
        if name == "Nacreous Hydra":
            preferred_set = "WAS"
        elif name == "Yamamura the Wanderer":
            preferred_set = "BLD"
        elif name == "Mirror Image":
            preferred_set = "WAS"
            
        if preferred_set:
            match = next((c for c in cards if c.get('card_name') == name and c.get('shape') != 'token' and c.get('set') == preferred_set), None)
            if not match:
                match = next((c for c in cards if c.get('card_name') == name and c.get('shape') != 'token'), None)
        else:
            match = next((c for c in cards if c.get('card_name') == name and c.get('shape') != 'token'), None)
            
        if match:
            # Create a copy so we don't modify the source data multiple times if names repeat
            card_copy = dict(match)
            # Add tier information
            if name in tier_5_names:
                card_copy['tier'] = 5
            elif name in tier_4_names:
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
    token_names = [
        ("Bird", "AEX"), ("Construct", "ACE"), ("Ox", "KOD"), ("Centaur Knight", "GSC"), 
        ("Jwanga Djitu", "ACE"), ("Beast", "SHF"), ("Dragon", "NJB"), ("Bard", "NJB"),
        ("Zombie", "ACE"), ("Twin Shivs", "AEX")
    ]
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

    # Also copy to root lists/ folder for immediate use by the game
    root_output_path = os.path.join('lists', 'coliseum-cards.json')
    with open(root_output_path, 'w', encoding='utf-8') as f:
        json.dump({"cards": final_cards}, f, indent=4)

    print(f"Successfully created {output_path} and {root_output_path} with {len(final_cards)} cards.")

if __name__ == '__main__':
    create_coliseum_card_list()
