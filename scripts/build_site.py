import os
import sys
import shutil

import image_flip
import card_edge_trimmer
import list_to_list
import print_html_for_index
import print_html_for_search
import print_html_for_spoiler

set_codes = []
for entry in os.scandir('sets'):
	if(entry.is_dir() and entry.name[-6:] == '-files'):
		set_codes.append(entry.name[:-6])

for code in set_codes:
	image_flip.flipImages(code)
	with open(os.path.join('sets', code + '-files', code + '-trimmed.txt'), encoding='utf-8-sig') as f:
		trimmed = f.read()
		if trimmed == "false":
			card_edge_trimmer.batch_process_images(code)
			with open(os.path.join('sets', code + '-files', code + '-trimmed.txt'), 'w') as file:
				file.write("true")
	list_to_list.convertList(code)

	custom_dir = os.path.join('custom', code + '-files')
	if os.path.isdir(custom_dir):
		for file in os.listdir(custom_dir):
			filepath = os.path.join(custom_dir, file)
			destination = os.path.join('sets', code + '-files')
			if os.path.isdir(filepath):
				destination = os.path.join(destination, file)
				if os.path.isdir(destination):
					shutil.rmtree(destination)
				shutil.copytree(filepath, destination)
			else:
				shutil.copy(filepath, destination)
			print(filepath + ' added.')

	print_html_for_spoiler.generateHTML(code, set_codes)

custom_img_dir = os.path.join('custom', 'img')
if os.path.isdir(custom_img_dir):
	for file in os.listdir(custom_img_dir):
		filepath = os.path.join(custom_img_dir, file)
		destination = 'img'
		shutil.copy(filepath, destination)
		print(filepath + ' added.')

print_html_for_search.generateHTML(set_codes)
print_html_for_index.generateHTML(set_codes)