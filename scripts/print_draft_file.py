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
				if card['rarity'] == slot_name and not filtered(card, filters) and not 'Basic' in card['type'] and not 'token' in card['shape']:
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
			"image_uris": {
				"en": "https://''' + github_path + '''/sets/ATR-files/img/''' + str(card['number']) + '''_''' + card['card_name'] + '''.png"
			}
		},
	'''

	draft_string += ''']

'''
	
	for slot in structure:
		draft_string += '''[''' + slot['name'] + '''(''' + str(slot['count']) + ''')]
'''
		for c in booster[slot['name']]:
			if slot['balanced']:
				count = -1
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
				draft_string += '''	''' + str(count) + ''' ''' + c['card_name'] + '''
'''
			else:
				draft_string += '''	5 ''' + c['card_name'] + '''
'''

	with open(os.path.join('sets', code + '-files', code + '-draft.txt'), 'w') as f:
		f.write(draft_string)
