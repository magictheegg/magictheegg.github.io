import os
import sys
import re
import json

#F = Fungustober's notes

def convertList(setCode):
	#F: inputList = sets/SET-files/SET.json
	inputList = os.path.join('sets', setCode + '-files', setCode + '.json')
	#F: outputList = lists/SET-list.json
	outputList = os.path.join('lists', setCode + '-list.json')
	
	#create the two blanks as dictionaries so we can fit them into the JSON structure
	blank1 = {'card_name':'e'}
	blank2 = {'card_name':'er'}
	#F: open up the inputList file
	with open(inputList, encoding='utf-8-sig') as f:
		raw = json.load(f)
	cards = raw['cards']
	
	master_list = []
	sort_indexes = { 'zzz': [] }
	
	#F: now go over the cards again
	for i in range(len(cards)):
		card = cards[i]

		# sort types
		# name list first, cards second, basics third, tokens last
		if card['card_name'].isupper():
			card['rarity'] = 0
		elif 'Basic' in card['type']:
			card['rarity'] = 2
		elif 'token' in card['shape']:
			card['rarity'] = 3
		else:
			card['rarity'] = 1

		# filter sorting tags
		notes = card['notes']
		if '!sort' in notes:
			#F: notes = index of !sort + 6 to the end of the string
			sort = notes[notes.index('!sort') + 6:]
			card['notes'] = sort
			if sort not in sort_indexes:
				sort_indexes[sort] = []
			sort_indexes[sort].append(card)
		else:
			sort_indexes['zzz'].append(card)

	sort_indexes = dict(sorted(sort_indexes.items()))

	for sort in sort_indexes:
		cards = sorted(sort_indexes[sort], key=lambda x : (x['rarity'], x['card_name']))

		for card in cards:
			master_list.append({'card_name':card['card_name'],'number':card['number'],'shape':card['shape']})

		if len(cards) % 5 != 0:
			for x in range(5 - (len(cards) % 5)):
				master_list.append(blank1)

		if (sort != 'zzz'):
			for x in range(5):
				master_list.append(blank2)

	#F: lists/SET-list.json finally comes into play
	with open(outputList, 'w', encoding="utf-8-sig") as f:
		json.dump(master_list, f)
