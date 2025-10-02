import os
import sys
import json
import markdown
import re

#F = Fungustober's notes

def generateHTML(setCode):
	with open(os.path.join('lists', 'set-order.json'), encoding='utf-8-sig') as j:
		so_json = json.load(j)

	with open(os.path.join('sets', setCode + '-files', setCode + '.json'), encoding='utf-8-sig') as j:
		set_js = json.load(j)
		set_image_type = 'png' if 'image_type' not in set_js else set_js['image_type']
		set_name = '' if 'name' not in set_js else set_js['name']

	codes = []
	for key in so_json:
		if (so_json[key][0] == ""):
			continue
		for code in so_json[key]:
			codes.append(code)
	#F: this is SET-preview.html, the file that this outputs to
	output_html_file = os.path.join('previews', setCode + '.html')
	magic_card_back_image = '/img/card_back.png'
	#F: /sets/SET-files/img/
	set_img_dir = os.path.join('sets', setCode + '-files', 'img')
	card_image_names = [f
	   if f.endswith(('_front', '_back')) and re.sub(r'^\d+_', '', f) in ['front', 'back']
	   else re.sub(r'^\d+_', '', f) 
	   for f in (file[:-4].replace(u'\ufeff', '') for file in os.listdir(set_img_dir))
	]

	previewed_path = os.path.join('sets', setCode + '-files', 'previewed.txt')
	if os.path.isfile(previewed_path):
		with open(previewed_path, encoding='utf-8-sig') as f:
			previewed = f.read().split('\n')

	#F: lists/SET-list.json, defined in list_to_list.py
	with open(os.path.join('lists', setCode + '-list.json'), encoding='utf-8-sig') as f:
		cards = json.load(f)

	#F: go over the codes, check if there's a /sets/SET-files/ignore.txt file for it
	#F: if there is, remove that index from Codes
	#F: otherwise, increment by one
	#F: repeat until breaking out of the loop
	i = 0
	while i < len(codes):
		if os.path.exists(os.path.join('sets', codes[i] + '-files', 'ignore.txt')):
			del codes[i]
		else:
			i += 1

	header_length = 11
	# Start creating the HTML file content
	html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
	<link rel="icon" type="image/png" href="/sets/''' + setCode + '''-files/icon.png"/>
	<link rel="stylesheet" href="/resources/header.css">
	<title>''' + setCode + ''' visual preview</title>
	<style>
		@font-face {
			font-family: Beleren;
			src: url('/resources/beleren.ttf');
		}
		body {
			font-family: Arial, sans-serif;
			margin: 0;
			padding: 0;
			overscroll-behavior: none;
			background-size: cover;
			background-attachment: fixed;
		}
		.main-content {
			position: relative;
			width: 100%;
			float: left;
			z-index: 2;
			justify-items: center;
		}
		.sidebar {
			position: sticky;
			top: 0;
			display: none;
			text-align: center;
			padding-right: 3%;
			z-index: 1;
			justify-items: center;
		}
		.sidebar-container {
			width: 80%;
			max-width: 375px;
			position: relative;
		}
		.sidebar-h-img {
			opacity: 0;
			transform: rotateY(0deg) rotate(90deg);
			position: absolute;
			left: 10%;
			top: 10%;
			width: 85%;
		}
		.sidebar-img {
			vertical-align: middle;
			width: 100%;
		}
		.close-btn {
			background: url('/img/close.png') no-repeat;
			background-size: contain;
			background-position: center;
			width: 10%;
			height: 10%;
			border: none;
			cursor: pointer;
			position: absolute;
			right: 4%;
		}
		.close-btn:hover {
			background: url('/img/close-hover.png') no-repeat;
			background-size: contain;
			background-position: center;
		}
		.grid-container {
			display: grid;
			grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
			gap: 2px;
			padding-left: 5%;
			padding-right: 5%;
			padding-bottom: 1%;
			justify-items: center;
			max-width: 1200px;
		}
		.grid-container img {
			width: 100%;
			height: auto;
			display: block;
			visibility: hidden;
			cursor: pointer;
		}
		.banner {
			width: 100%;
			height: auto;
			padding-top: 80px;
			padding-bottom: 50px;
		}
		.logo {
			display: block;
			margin: auto;
			max-width: 30%;
			max-height: 320px;
		}
		.container {
			position: relative;
			width: 100%;
		}
		.container img {
			width: 100%;
			height: auto;
		}
		.flip-btn {
			background: url('/img/flip.png') no-repeat;
			background-size: contain;
			background-position: center;
			width: 15%;
			height: 11%;
			cursor: pointer;
			border: none;
			position: absolute;
			left: 50%;
			top: 48%;
			transform: translate(-50%, -50%);
			opacity: 0.5;
		}
		.flip-btn:hover {
			background: url('/img/flip-hover.png') no-repeat;
			background-size: contain;
			background-position: center;
		}
		.dropdown {
			background: rgba(23, 23, 23, 0.8);
			border-radius: 8px;
			position: absolute;
			left: 5%;
			width: fit-content;
			max-width: 90%;
			margin: 20px 0;
			padding: 5px 0;
			display: grid;
			grid-template-columns: 1fr;
			z-index: 3;
		}
		.dropdown .set-bar {
			font-family: Beleren;
			font-size: 20px;
			text-decoration: none;
			color: #e3e3e3;
			display: flex;
			gap: 10px;
			align-items: center;
			padding: 0 12px;
			margin: 5px;
		}
		.dropdown .set-bar:hover {
			background: rgba(163, 163, 163, 0.5);
			color: #f3f3f3;
		}
		.dropdown .set-bar img {
			width: 32px;
		}
		.dropdown .inactive {
			height: 0px;
			overflow: hidden;
			margin: 0px 5px;
		}
		.preload-hidden {
			display: none;
		}
		.addenda-container {
			text-align: center;
			width: fit-content;
			max-width: 1200px;
			padding: 0 5%;
		}
		/* This is here to enable the stickiness in a Float environment. I don't know why it works but it does */
		.footer {
			clear: both;
		}
	</style>
</head>
<body>
	<img class="preload-hidden" src="/img/dot.png" />
	<img class="preload-hidden" src="/sets/''' + setCode + '''-files/logo.png" />
	'''

	for code in codes:
		html_content += '''<img class="preload-hidden" src="/sets/''' + code + '''-files/icon.png" />
		'''

	if os.path.exists(os.path.join('sets', setCode + '-files', 'bg.png')):
		html_content +='''<img class="preload-hidden" id="bg" src="/sets/''' + setCode + '''-files/bg.png" />

		'''

	#F: goes to resources/snippets/header.txt and gets a header, inserting it after everything so far
	with open(os.path.join('scripts', 'snippets', 'header.txt'), encoding='utf-8-sig') as f:
		snippet = f.read()
		html_content += snippet

	html_content += '''

	<div class="dropdown" id="dropdown" onmouseenter="rolldown()" onmouseleave="rollup()">
	'''
	
	count = 0
	html_content += f'''
		<a class="set-bar" href="{setCode}"><img src="/sets/{setCode}-files/icon.png">{set_name}</a>
	'''
	for code in codes:
		if code == setCode:
			continue
		with open(os.path.join('sets', code + '-files', code + '.json'), encoding='utf-8-sig') as j:
			js = json.load(j)
		html_content += f'''
		<a class="set-bar inactive" href="{code}"><img src="/sets/{code}-files/icon.png">{js['name']}</a>
	'''
	'''
	for code in codes:
		prev_path = os.path.join('sets', setCode + '-files', 'prev_icon.png')
		if count != 0:
			html_content += '		 <div class="dot"><img src="/img/dot.png"></img></div>\n'
		html_content += f'		<div class="icon"><a href="{code}"><img src="/sets/{code}-files/' + ('prev_' if os.path.isfile(prev_path) else '') + 'icon.png"></img></a></div>\n'
		count += 1
		if count == header_length:
			count = 0
	'''

	html_content += '''
		</div>
		<div class="banner">
		<img class="logo" src="/sets/''' + setCode + '''-files/logo.png">
		</div>
		<div class="main-content" id="main-content">
			<div class="grid-container">
	'''

	# Loop over each image and create an img tag for each one
	for card in cards:
		if 'a->' in card:
			html_content += f'				<div id="{card[3:]}" class="anchor"></div>\n'
			continue
		if 'l->' in card:
			html_content += f'''			</div>
			<div class="banner">
					<img id="{card[3:]}-logo" class="logo" src="/sets/{card[3:]}-files/logo.png">
			</div>
			<div class="grid-container">
'''
			continue
		if 'h->' in card:
			with open(os.path.join('sets', setCode + '-files', card[3:]), encoding='utf-8-sig') as f:
				addenda = f.read()
			if card[-3:] == '.md':
				addenda = markdown.markdown(addenda)
			html_content += f'''			</div>
			<div class="addenda-container">
				{addenda}
			</div>
			<div class="grid-container">
'''
			continue
		#F: originally, in list_to_list.py, the card names were all stitched with a number and a _ (or a number and t_ if it's a token)
		#F: Since list_to_list.py was retrofitted by me to make the master_list output into a .json file, that process must be done here instead
		#F: Using a JSON file for SET-list *is* slightly overkill, but it makes the card_num assignment easier.
		card_name = ""
		#F: originally, this script would look for a _ in the card name, and if it wasn't there, it was set to -1.
		#F: (if it was there, it just made everything before the _ be the card number)
		#F: we can replicate this under the JSON paradigm by having the card num be initialized as -1 and be set only if it's not a blank
		#CE: setting card_num back to '' so we can concatenate 't' to the end of tokens
		card_num = ''
		if card['card_name'] == 'e':
			card_name = 'e'
			image_type = 'png'
		elif card['card_name'] == 'er':
			card_name = 'er'
			image_type = 'png'
		elif 'image_name' in set_js and set_js['image_name'] == 'position':
			card_name = card['position']
			card_num = str(card['number'])
			image_type = set_image_type
		elif 'token' in card['shape']:
			card_name = str(card['number']) + 't_' + card['card_name']
			card_num = str(card['number']) + 't'
			image_type = set_image_type
		else:
			card_name = str(card['number']) + '_' + card['card_name']
			card_num = str(card['number'])
			image_type = set_image_type

		card_name_cleaned = card_name.replace('\'','')

		# used for DFCs only
		card_code = setCode if 'set' not in card else card['set']
		dfc_front_path = card_name + '_front'
		dfc_back_path = card_name + '_back'
		dfc_front_img_path = os.path.join('sets', card_code + '-files', 'img', dfc_front_path + '.' + image_type)
		dfc_back_img_path = os.path.join('sets', card_code + '-files', 'img', dfc_back_path + '.' + image_type)

		#F: these flags are used in later parts of the code, including the HTML.
		#F: if the flag is @N, then only the card back is displayed
		#F: if the flag is @E, then the ability to click it is removed (since it's just a blank image for positioning)
		#F: if the flag is @X or @XD, nothing happens
		flag = '@N'
		if 'previewed' not in locals() or card['card_name'] in previewed:
			flag = '@X'
			if card['card_name'] + '_front' in card_image_names or 'position' in card and card['position'] + '_front' in card_image_names:
				flag = '@XD'

		if card_name == 'e' or card_name == 'er':
			image_dir = 'img'
			flag = '@E'
		else:
			#F: /sets/SET-files/img/
			image_dir = os.path.join('sets', card_code + '-files', 'img')

		#F: /sets/SET-files/img/NUMBER(t?)_NAME.png
		image_path = os.path.join(image_dir, card_name + '.' + image_type)
		rotated = str('shape' in card and 'spli' in card['shape']).lower()

		#F: if the flag is @XD, add something to html_content to get the front and back images, otherwise add something else
		if flag == '@XD':
			html_content += f'				<div class="container"><img loading="lazy" data-alt_src="/{dfc_back_img_path}" alt="/{dfc_front_img_path}" id="{card_name_cleaned}" data-flag="{flag}" onclick="openSidebar(\'{card_name_cleaned}\',{rotated})"><button class="flip-btn" onclick="imgFlip(\'{card_name_cleaned}\')"></button></div>\n'
		else:
			html_content += f'				<div class="container"><img loading="lazy" alt="/{image_path}" id="{card_name_cleaned}" data-flag="{flag}" onclick="openSidebar(\'{card_name_cleaned}\',{rotated})"></div>\n'

	# Closing the div and the rest of the HTML
	html_content += '''	</div>
	</div>
	<div class="sidebar" id="sidebar">
		<div class="sidebar-container">
			<img id="sidebar_img" class="sidebar-img" src="/img/er.png">
			<img id="sidebar_h_img" class="sidebar-h-img">
			<button class="flip-btn" id="sidebar-flip-btn" onclick="imgFlip('sidebar_img')"></button>
		</div>
		<button class="close-btn" onclick="closeSidebar()"></button>
	</div>
	<div class="footer"></div>

	<script>
	const delay = ms => new Promise(res => setTimeout(res, ms));
		let specialchars = "";

	document.addEventListener('DOMContentLoaded', async function() {
		'''

	#F: /resources/snippets/load-files.txt
	#F: load-files.txt's snippet adds something that goes over all the lines of lists/all-cards.txt and puts them into an array
	#F: it also grabs from resources/replacechars.txt, which just defines all the icky no-good chars that need to be replaced
	with open(os.path.join('scripts', 'snippets', 'load-files.txt'), encoding='utf-8-sig') as f:
		snippet = f.read()
		html_content += snippet

	html_content += '''
		preloadImgs = document.getElementsByClassName('preload-hidden');

		let images_loaded = [];

		do {
			await delay(100);
			images_loaded = []
			for (const img of preloadImgs)
			{
				images_loaded.push(isImageOk(img));
			}
		}
		while (images_loaded.includes(false));

		'''

	#F: sets/SET-files/bg.png
	#F:
	if os.path.exists(os.path.join('sets', setCode + '-files', 'bg.png')):
		html_content += '''document.body.style.backgroundImage = 'url(' + document.getElementById("bg").src + ')';'''

	#F: this is the point where the DOMContentLoaded bit ends
	html_content += '''
		loadImages();
	});

	function isImageOk(img) {
		if (!img.complete || img.naturalWidth == 0) {
			return false;
		}

		return true;
	}

	function loadImages() {
		const images = document.querySelectorAll('.grid-container img');

		images.forEach(img => {
			const flag = img.getAttribute('data-flag');

			if (flag === '@N') {
				img.src = '/img/card_back.png';
				img.removeAttribute("onclick");
				img.style.cursor = 'default';
			}
			else
			{
				img.src = img.alt;

				if (flag === '@E') {
					img.removeAttribute("onclick");
					img.style.cursor = 'default';
				}
			}

			img.style.visibility = 'visible';
		});
	}

	window.addEventListener('resize', function(event) {
		setSidebarTop();
	}, true);

	function setSidebarTop() {
		let vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
		let sh = document.getElementById('sidebar').offsetHeight;
		let height = 100 * ((vh - sh) / 2) / vh;
		document.getElementById('sidebar').style.top = height + '%';
	}

	let horizontal = false;

	function imgFlip(num) {
		const img = document.getElementById(num);
		const seconds = 0.2;
		const rotated_img = document.getElementById('sidebar_h_img');

        img.style.transition = seconds.toString() + "s";
        img.style.transform = "rotateY(90deg)";

        if (num == 'sidebar_img')
		{
			const sidebar_img = document.getElementById('sidebar_img');

			if (horizontal)
            {
            	rotated_img.style.transition = seconds.toString() + "s";
           		rotated_img.style.transform = "rotateY(90deg) rotate(90deg)";

           		if (rotated_img.style.opacity != "0") {
		            setTimeout(() => {
		                rotated_img.style.opacity = "0";
		                img.style.filter = "none";
		            }, (seconds / 2) * 1000);
		        }
		        else {
		        	setTimeout(() => {
		                rotated_img.style.opacity = "1";
		                img.style.filter = "blur(2px) brightness(0.7)";
		            }, (seconds / 2) * 1000);
		        }
            }
		}

         setTimeout(function() {
            tmp = document.getElementById(num).src;
			document.getElementById(num).src = document.getElementById(num).dataset.alt_src;
			document.getElementById(num).dataset.alt_src = tmp;

            img.style.transition = seconds.toString() + "s";
            img.style.transform = "rotateY(0deg)";

            if (horizontal)
            {
            	rotated_img.style.transition = seconds.toString() + "s";
           		rotated_img.style.transform = "rotateY(0deg) rotate(90deg)";
            }
        }, seconds * 1000);
	}

	function openSidebar(id, h = false) {
		horizontal = h;
		scroll_pct = window.scrollY / document.documentElement.scrollHeight;

		document.getElementById('sidebar').style.display = 'grid';

		const rotated_img = document.getElementById('sidebar_h_img');
		const sidebar_img = document.getElementById('sidebar_img');

		sidebar_img.style.transition = "none";
		rotated_img.style.transition = "none";
		sidebar_img.src = document.getElementById(id).src;
		rotated_img.src = document.getElementById(id).src.replace("_back", "_front");

		if (horizontal && !sidebar_img.src.includes("_back"))
		{
			rotated_img.style.opacity = "1";
			sidebar_img.style.filter = "blur(2px) brightness(0.7)";
		}
		else
		{
			rotated_img.style.opacity = "0";
			sidebar_img.style.filter = "";
		}

		if (document.getElementById(id).dataset.alt_src)
		{
			document.getElementById('sidebar_img').dataset.alt_src = document.getElementById(id).dataset.alt_src;
			document.getElementById('sidebar-flip-btn').style.display = 'block';
		}
		else
		{
			delete document.getElementById('sidebar_img').dataset.alt_src;
			document.getElementById('sidebar-flip-btn').style.display = 'none';
		}
		document.getElementById('main-content').style.width = '60%';

		scroll_pos = scroll_pct * document.documentElement.scrollHeight;
		window.scrollTo(window.scrollX, scroll_pos);
		setSidebarTop();
	}

	function closeSidebar() {
		scroll_pct = window.scrollY / document.documentElement.scrollHeight;

		document.getElementById('sidebar').style.display = 'none';
		document.getElementById('main-content').style.width = '100%';


		scroll_pos = scroll_pct * document.documentElement.scrollHeight;
		window.scrollTo(window.scrollX, scroll_pos);
	}

	function rolldown() {
		dropdown.style.gridTemplateColumns = "repeat(3, 1fr)";
		var sets = document.querySelectorAll('.inactive');
		for(const set of sets)
		{
			set.style.height = "auto";
			set.style.margin = "5px";
		}
	}

	function rollup() {
		dropdown.style.gridTemplateColumns = "1fr";
		var sets = document.querySelectorAll('.inactive');
		for(const set of sets)
		{
			set.style.height = "0px";
			set.style.margin = "0px 5px";
		}
	}

	document.getElementById("search").addEventListener("keypress", function(event) {
		if (event.key === "Enter") {
			event.preventDefault();
			search();
		}
	});

	function search() {
		const url = new URL('search', window.location.origin);
		url.searchParams.append('search', document.getElementById("search").value);
		window.location.href = url;
	}

		'''
	
	#F: /resources/snippets/random-card.txt
	#F: code that lets you go to a random card
	with open(os.path.join('scripts', 'snippets', 'random-card.txt'), encoding='utf-8-sig') as f:
		snippet = f.read()
		html_content += snippet

	html_content += '''
	</script>
</body>
</html>
'''

	# Write the HTML content to the output HTML file
	with open(output_html_file, 'w', encoding="utf-8") as file:
		file.write(html_content)

	print(f"HTML file saved as {output_html_file}")