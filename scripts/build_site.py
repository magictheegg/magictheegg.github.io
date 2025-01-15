import os
import sys
import shutil

import image_flip
import card_edge_trimmer
import list_to_list
import print_html_for_index
import print_html_for_search
import print_html_for_spoiler
import print_html_for_card
import print_html_for_set
import print_html_for_sets_page

def genAllCards(codes):
	file_input = ''
	for code in codes:
		with open(os.path.join('sets', code + '-files', code + '-raw.txt'), encoding='utf-8-sig') as f:
			raw = f.read()
			file_input += raw.replace('\n','NEWLINE').replace('REPLACEME','\\n')
	file_input = file_input.removesuffix('\\n')

	with open(os.path.join('lists', 'all-cards.txt'), 'w', encoding='utf-8-sig') as f:
		f.write(file_input.replace('—', '–'))

set_codes = []
for entry in os.scandir('sets'):
	if entry.is_dir() and entry.name[-6:] == '-files':
		set_codes.append(entry.name[:-6])
	elif entry.name != 'README.md' and os.path.isfile(entry):
		os.remove(entry)

set_codes.sort()

genAllCards(set_codes)

if os.path.isdir('cards'):
	shutil.rmtree('cards')
os.mkdir('cards')

for code in set_codes:
	os.mkdir(os.path.join('cards', code))

	image_flip.flipImages(code)
	set_dir = code + '-files'
	with open(os.path.join('sets', set_dir, code + '-trimmed.txt'), encoding='utf-8-sig') as f:
		trimmed = f.read()
		if trimmed == "false":
			card_edge_trimmer.batch_process_images(code)
			with open(os.path.join('sets', set_dir, code + '-trimmed.txt'), 'w') as file:
				file.write("true")

	list_to_list.convertList(code)

	custom_dir = os.path.join('custom', set_dir)
	if os.path.isdir(custom_dir):
		for file in os.listdir(custom_dir):
			filepath = os.path.join(custom_dir, file)
			destination = os.path.join('sets', set_dir)
			if os.path.isdir(filepath):
				destination = os.path.join(destination, file)
				if os.path.isdir(destination):
					shutil.rmtree(destination)
				shutil.copytree(filepath, destination)
			else:
				shutil.copy(filepath, destination)
			print(filepath + ' added')

	if not os.path.exists(os.path.join('sets', code + '-files', 'ignore.txt')):
		print_html_for_spoiler.generateHTML(code, set_codes)
	print_html_for_set.generateHTML(code)

with open(os.path.join('lists', 'all-cards.txt'), encoding='utf-8-sig') as f:
	cards = f.read()
cards = cards.replace('\n','NEWLINE').replace('REPLACEME','\\n').rstrip('\\n')
card_array = cards.split('\\n')
for card in card_array:
	card_stats = card.split('\t')
	card_name = card_stats[0]
	with open(os.path.join('resources', 'replacechars.txt'), encoding='utf-8-sig') as f:
		chars = f.read()
	for char in chars:
		card_name = card_name.replace(char, '')
	with open(os.path.join('cards', card_stats[11], card_stats[4] + '_' + card_name + '.txt'), 'w', encoding='utf-8-sig') as f:
		f.write(card)
	print_html_for_card.generateHTML(card)
print(f"HTML card files saved as cards/<set>/<card>.html")

custom_img_dir = os.path.join('custom', 'img')
if os.path.isdir(custom_img_dir):
	for file in os.listdir(custom_img_dir):
		filepath = os.path.join(custom_img_dir, file)
		destination = 'img'
		shutil.copy(filepath, destination)
		print(filepath + ' added')

print_html_for_sets_page.generateHTML(set_codes)
print_html_for_search.generateHTML(set_codes)
print_html_for_index.generateHTML(set_codes)







