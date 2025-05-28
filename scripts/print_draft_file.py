import os
import sys
import json

#F = Fungustober's notes
def filtered(card, filters):
	for f in filters:
		if ('!' + f) in card['notes']:
			return True
	return False

def generateFile(code):
	with open(os.path.join('sets', code + '-files', code + '.json'), encoding='utf-8-sig') as j:
		set_data = json.load(j)

	structure_path = os.path.join('resources', set_data['draft_structure'].replace(' ','-') + '-structure.json')
	if os.path.isfile(os.path.join('sets', code + '-files', 'structure.json')):
		structure_path = os.path.join('sets', code + '-files', 'structure.json')
	with open(structure_path, encoding='utf-8-sig') as j:
		structure = json.load(j)

	filters = []
	booster = {}

	github_path = os.path.split(os.getcwd())[1] # this gets the current working directory, so it's an easy failcase

	for slot in structure:
		booster[slot['name']] = []
		if slot['filtered']:
			filters.append(slot['name'])

	draft_string = '''[CustomCards]
	[
	'''

	for card in set_data['cards']:
		for slot in structure:
			slot_name = slot['name']
			if slot_name == 'wildcard' and not filtered(card, filters) and not 'Basic' in card['type'] and not 'token' in card['shape']:
				booster[slot_name].append(card)
			elif not slot['custom']:
				if ((card['rarity'] == 'mythic' and slot_name == 'rare') or card['rarity'] == slot_name) and not filtered(card, filters) and not 'Basic' in card['type'] and not 'token' in card['shape']:
					booster[slot_name].append(card)
			else:
				if ('!' + slot_name) in card['notes']:
					booster[slot_name].append(card)

		draft_string += '''	{
			"name": "''' + card['card_name'] + '''",
			"rarity": "''' + card['rarity'] + '''",
			"mana_cost": "''' + card['cost'] + '''",
			"type": "''' + card['type'] + '''",
			"collector_number": "''' + str(card['number']) + '''",
	'''

		if 'double' in card['shape']:
			draft_string += '''		"back": {
				"name": "",
				"type": "",
				"image_uris": {
					"en": "https://''' + github_path + '''/sets/''' + code + '''-files/img/''' + str(card['number']) + '''_''' + card['card_name'] + '''_back.''' + set_data['image_type'] + '''"
				}
			},
			"image_uris": {
				"en": "https://''' + github_path + '''/sets/''' + code + '''-files/img/''' + str(card['number']) + '''_''' + card['card_name'] + '''_front.''' + set_data['image_type'] + '''"
			}
		},
	'''
		else:
			draft_string += '''		"image_uris": {
				"en": "https://''' + github_path + '''/sets/''' + code + '''-files/img/''' + str(card['number']) + '''_''' + card['card_name'] + '''.''' + set_data['image_type'] + '''"
			}
		},
	'''

	draft_string += ''']

'''
	
	for slot in structure:
		draft_string += '''[''' + slot['name'] + '''(''' + str(slot['count']) + ''')]
'''
		for c in booster[slot['name']]:
			count = -1
			if slot['balanced'] == 'b': # normal distribution
				match c['rarity']:
					case 'mythic':
						count = 1
					case 'cube':
						count = 1
					case 'rare':
						count = 2
					case 'uncommon':
						count = 4
					case 'common':
						count = 8
			elif slot['balanced'] == 'w': # wildcard distribution
				# these numbers look weird but they distribute to 0.6 u / 0.2 c / 0.17 r / 0.03 m (I did the math)
				match c['rarity']:
					case 'mythic':
						count = 4
					case 'rare':
						count = 7
					case 'uncommon':
						count = 15
					case 'common':
						count = 6
			else:
				count = 5

			if count > 0:
				draft_string += '''	''' + str(count) + ''' ''' + c['card_name'] + '''
'''

	with open(os.path.join('sets', code + '-files', code + '-draft.txt'), 'w') as f:
		f.write(draft_string)
