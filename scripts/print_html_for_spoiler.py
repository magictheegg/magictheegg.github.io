import os
import sys

def generateHTML(setCode, setCodes):
	codes = setCodes.copy()
	output_html_file = setCode + '-spoiler.html'
	magic_card_back_image = 'img/card_back.png'
	set_img_dir = os.path.join('sets', setCode + '-files', 'img')
	previewed = [file[:-4].replace(u'\ufeff', '') for file in os.listdir(set_img_dir)]

	with open(os.path.join('lists', setCode + '-list.txt'), encoding='utf-8-sig') as f:
		cards = [card.replace(u'\ufeff', '').rstrip() for card in f]

	i = 0
	while i < len(codes):
		if os.path.exists(os.path.join('sets', codes[i] + '-files', 'ignore.txt')):
			del codes[i]
		else:
			i += 1

	# Start creating the HTML file content
	html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
	<link rel="icon" type="image/png" href="sets/''' + setCode + '''-files/icon.png"/>
	<link rel="stylesheet" href="/resources/header.css">
	<title>''' + setCode + ''' visual spoiler</title>
	<style>
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
			padding-right: 2.5%;
			z-index: 1;
		}
		.sidebar img {
			vertical-align: middle;
			max-width: 375px;
			width: 30%;
		}
		.sidebar .btn {
		  background: url('img/close.png') no-repeat;
		  background-size: contain;
		  background-position: center;
		  width: 10%;
		  height: 10%;
		  border: none;
		  cursor: pointer;
		  position: absolute;
		  right: -1.5%;
		}
		.sidebar .btn:hover {
		  background: url('img/close-hover.png') no-repeat;
		  background-size: contain;
		  background-position: center;
		  border: none;
		  cursor: pointer;
		  position: absolute;
		  right: -1.5%;
		}
		.grid-container {
			display: grid;
			grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
			gap: 2px;
			padding-left: 5%;
			padding-right: 5%;
			padding-bottom: 3%;
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
			padding-top: 20px;
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
		.container .btn {
		  background: url('img/flip.png') no-repeat;
		  background-size: contain;
		  background-position: center;
		  width: 15%;
		  height: 11%;
		  cursor: pointer;
		  border: none;
		  position: absolute;
		  top: 6.5%;
		  left: 8.5%;
		  transform: translate(-50%, -50%);
		}
		.container .btn:hover {
		  background: url('img/flip-hover.png') no-repeat;
		  background-size: contain;
		  background-position: center;
		  width: 15%;
		  height: 11%;
		  cursor: pointer;
		  border: none;
		  position: absolute;
		  top: 6.5%;
		  left: 8.5%;
		  transform: translate(-50%, -50%);
		}
		.icon-bar {
			display: grid;
			grid-template-columns: repeat(10, 3fr 2fr) 3fr;
			gap: 1px;
			padding-left: 5%;
			padding-right: 5%;
			padding-top: 2%;
			padding-bottom: 1%;
			justify-items: center;
			align-items: center;
		}
		.icon-bar .icon img {
			width: 90%;
			max-width: 80px;
			height: auto;
			display: block;
			padding: 5%;
			margin: auto;
			text-align: center;
		}
		.icon-bar .dot img {
			width: 50%;
			max-width: 65px;
			height: auto;
			display: block;
			margin: auto;
			text-align: center;
		}
		.preload-hidden {
			display: none;
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

	html_content += '''

	<div class="header">
		<div class="search-grid">
			<a href="/"><img class="sg-logo" src="/img/banner.png"></a>
			<img class="sg-icon" src="/img/search.png">
			<input type="text" inputmode="search" placeholder="Search ..." name="search" id="search" spellcheck="false" autocomplete="off" autocorrect="off" spellcheck="false">
			<a href="/all-sets"><img src="/img/sets.png" class="sg-icon">Sets</a>
			<a onclick="randomCard()"><img src="/img/random.png" class="sg-icon">Random</a>
		</div>
	</div>

	<div class="icon-bar">
	'''

	for code in codes:
		prev_path = os.path.join('sets', setCode + '-files', 'prev_icon.png')
		if codes[0] != code:
			html_content += '	   <div class="dot"><img src="img/dot.png"></img></div>\n'
		html_content += f'	  <div class="icon"><a href="{code}-spoiler"><img src="sets/{code}-files/' + ('prev_' if os.path.isfile(prev_path) else '') + 'icon.png"></img></a></div>\n'

	html_content += '''
		</div>
		<div class="banner">
		<img class="logo" src="sets/''' + setCode + '''-files/logo.png">
		</div>
		<div class="main-content" id="main-content">
			<div class="grid-container">
	'''

	# Loop over each image and create an img tag for each one
	for card_name in cards:
		card_num = card_name[:card_name.index('_')] if '_' in card_name else -1

		# used for DFCs only
		dfc_front_path = card_name + '_front'
		dfc_back_path = card_name + '_back'
		dfc_front_img_path = os.path.join('sets', setCode + '-files', 'img', dfc_front_path + '.png')
		dfc_back_img_path = os.path.join('sets', setCode + '-files', 'img', dfc_back_path + '.png')

		flag = '@N'
		if card_name in previewed:
			flag = '@X'
		if dfc_front_path in previewed:
			flag = '@XD'

		if card_name == 'e' or card_name == 'er':
			image_dir = 'img'
			flag = '@E'
		else:
			image_dir = os.path.join('sets', setCode + '-files', 'img')

		image_path = os.path.join(image_dir, card_name + '.png')

		if flag == '@XD':
			html_content += f'		  <div class="container"><img data-alt_src="{dfc_back_img_path}" alt="{dfc_front_img_path}" id="{card_num}" data-flag="{flag}" onclick="openSidebar({card_num})"><button class="btn" onclick="imgFlip({card_num})"></button></div>\n'
		else:
			html_content += f'		  <div class="container"><img alt="{image_path}" id="{card_num}" data-flag="{flag}" onclick="openSidebar(\'{card_num}\')"></div>\n'

	# Closing the div and the rest of the HTML
	html_content += '''	</div>\n'''

	add_path = os.path.join('sets', setCode + '-files', 'addenda', setCode + '-addendum.html')
	if os.path.isfile(add_path):
		with open(add_path) as f:
			for line in f:
				html_content += line

	html_content += '''</div>
	<div class="sidebar" id="sidebar">
		<img id="sidebar_img" src="img/er.png"></img>
		<button class="btn" onclick="closeSidebar()"></button>
	</div>
	<div class="footer"></div>

	<script>
	const delay = ms => new Promise(res => setTimeout(res, ms));
    let specialchars = "";

	document.addEventListener('DOMContentLoaded', async function() {
		await fetch('/lists/all-cards.txt')
			.then(response => response.text())
			.then(text => {
				card_list_stringified = text;
		}).catch(error => console.error('Error:', error));

        await fetch('/resources/replacechars.txt')
                .then(response => response.text())
                .then(text => {
                    specialchars = text; 
            }).catch(error => console.error('Error:', error));

		card_list_arrayified = card_list_stringified.split('\\\\n');

		for (let i = 0; i < card_list_arrayified.length; i++)
		{
			card_list_arrayified[i] = card_list_arrayified[i].split('\t');
		}
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

	if os.path.exists(os.path.join('sets', setCode + '-files', 'bg.png')):
		html_content += '''document.body.style.backgroundImage = 'url(' + document.getElementById("bg").src + ')';'''

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
				img.src = 'img/card_back.png';
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

	function imgFlip(num) {
		tmp = document.getElementById(num).src;
		document.getElementById(num).src = document.getElementById(num).dataset.alt_src;
		document.getElementById(num).dataset.alt_src = tmp;
	}

	function openSidebar(id) {
		scroll_pct = window.scrollY / document.documentElement.scrollHeight;
		
		document.getElementById('sidebar').style.display = 'block';
		document.getElementById('sidebar_img').src = document.getElementById(id).src;
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

	document.getElementById("search").addEventListener("keypress", function(event) {
		  if (event.key === "Enter") {
				event.preventDefault();
				search();
		  }
		});

		function search() {
			window.location = ("/search?search=" + document.getElementById("search").value);
		}

		function randomCard() {
            let i = Math.floor(Math.random() * (card_list_arrayified.length + 1));
            let card_name = card_list_arrayified[i][0];
            for (const char of specialchars)
            {
                card_name = card_name.replaceAll(char, "");
            }

            window.location = ('/cards/' + card_list_arrayified[i][11] + '/' + card_list_arrayified[i][4] + '_' + card_name);
        }
	</script>
</body>
</html>
'''

	# Write the HTML content to the output HTML file
	with open(output_html_file, 'w', encoding="utf-8") as file:
		file.write(html_content)

	print(f"HTML file saved as {output_html_file}")