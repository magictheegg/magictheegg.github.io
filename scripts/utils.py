import os
import json

base_url = ""

def load_config():
	global base_url
	config_path = os.path.join(os.getcwd(), 'resources', 'site-config.json')
	if os.path.exists(config_path):
		with open(config_path, 'r', encoding='utf-8-sig') as f:
			config = json.load(f)
			base_url = config.get('base_url', '')
			if base_url and not base_url.endswith('/'):
				base_url += '/'

def get_picurl(set_data, card, back=False):
	path = (
		f'sets/{card["set"]}-files/img/' +
		(f'{card["position"]}' if 'position' in card else f'{card["number"]}{"t" if "token" in card["shape"] else ""}_{card["card_name"]}') +
		('' if 'double' not in card['shape'] else '_back' if back else '_front') +
		f'.{card["image_type"] if "image_type" in card else set_data["image_type"]}'
	)
	return base_url + path

load_config()