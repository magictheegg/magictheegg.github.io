import os
import sys

def generateHTML(card):
	code = card.split('\t')[11]
	card_name = card.split('\t')[0]
	card_name_cleaned = card_name
	card_type = card.split('\t')[3]
	with open(os.path.join('resources', 'replacechars.txt'), encoding='utf-8-sig') as f:
		chars = f.read()
	for char in chars:
		card_name_cleaned = card_name_cleaned.replace(char, '')
	card_num = card.split('\t')[4]
	output_html_file = "cards/" + code + "/" + card_num + "_" + card_name_cleaned + ".html"

	with open(os.path.join("sets", code + "-files", code + "-fullname.txt"), encoding='utf-8-sig') as f:
		set_name = f.read()
	
	# Start creating the HTML file content
	html_content = '''<html>
<head>
  <title>''' + card.split('\t')[0] + '''</title>
  <link rel="icon" type="image/x-icon" href="/img/favicon.png">
  <link rel="stylesheet" href="/resources/mana.css">
  <link rel="stylesheet" href="/resources/header.css">
</head>
<style>
	@font-face {
	  font-family: Beleren;
	  src: url('/resources/beleren.ttf');
	}
	body {
		font-family: 'Helvetica', 'Arial', sans-serif;
		overscroll-behavior: none;
		margin: 0px;
		background-color: #f3f3f3;
	}
	a {
		text-decoration: none;
	}
	.banner-container {
		width: 100%;
		background-color: #bbbbbb;
		display: flex;
		justify-items: center;
		align-items: center;
	}
	.set-banner {
		font-family: Beleren;
		display: flex;
		gap: 30px;
		align-items: center;
		justify-items: center;
		font-size: 40px;
		color: #171717;
		margin: auto;
		padding-top: 10px;
		padding-bottom: 10px;
	}
	.set-banner img {
		width: 100px;
	}
	.image-grid {
		padding-top: 40px;
		width: 70%;
		max-width: 1000px;
		margin: auto;
		display: grid;
		grid-template-columns: minmax(200px, 2fr) minmax(200px, 2.5fr);
		gap: 30px;
		padding-bottom: 10px;
		justify-items: center;
	}
	.image-grid img {
		position: relative;
	}
	.card-image {
		float: left;
		width: 100%;
		max-width: 375px;
		height: auto;
		display: block;
	}
	.card-text {
		padding-top: 20px;
		padding-bottom: 20px;
		background: #fcfcfc;
		width: 100%;
		border: 1px solid #d5d9d9;
		border-top: 3px solid #171717;
		border-bottom: 3px solid #171717;
		border-radius: 6px;
		height: fit-content;
		min-height: 75%;
		margin-top: 3%;
		display: flex;
		flex-direction: column;
	}
	.card-text div {
		white-space: normal;
		font-size: 15px;
		padding-bottom: 10px;
		padding-left: 12px;
		padding-right: 12px;
		line-height: 155%;
	}
	.card-text .name-cost {
		font-weight: bold;
		font-size: 20px;
		white-space: pre-wrap;
	}
	.card-text .type {
		font-size: 16px;
	}
	.card-text .pt {
		font-weight: bold;
	}
	.card-text br {
		content: "";
		display: block;
		margin-bottom: 5px;
	}
	.card-text .printings {
		margin-top: auto;
		font-size: 12px;
		font-weight: bold;
		padding-bottom: 0px;
	}
	.printings a {
		color: #1338be;
		text-decoration: none;
	}
	.printings a:hover {
		color: #0492c2;
	}
	.img-container {
	  position: relative;
	  align-self: center;
	}
	.img-container img {
	  width: 100%;
	  height: auto;
	}
	.img-container .btn {
		background: url('/img/flip.png') no-repeat;
		background-size: contain;
		background-position: center;
		width: 15%;
		height: 11%;
		cursor: pointer;
		border: none;
		position: absolute;
		top: 6.5%;
		left: 8.5%;
		transform: translate(-50%, -85%);
	}
	.img-container .btn:hover {
		background: url('/img/flip-hover.png') no-repeat;
		background-size: contain;
		background-position: center;
		width: 15%;
		height: 11%;
		cursor: pointer;
		border: none;
		position: absolute;
		top: 6.5%;
		left: 8.5%;
		transform: translate(-50%, -85%);
	}
	.hidden {
		display: none;
	}
</style>
<body>
	'''

	with open(os.path.join('resources', 'snippets', 'header.txt'), encoding='utf-8-sig') as f:
		snippet = f.read()
		html_content += snippet

	html_content += '''

	<input type="text" id="display" class="hidden" value="cards-and-text"> <!-- here to make img-container-defs snippet work properly -->
	<div class="banner-container">
		<a class="set-banner" id="set-banner" href="/sets/''' + code + '''">
			<img class="set-logo" src="/sets/''' + code + '''-files/icon.png">
			<div class="set-title">''' + set_name + '''</div>
		</a>
	</div>

	<div class="grid-container" id="grid">
	</div>
	'''

	other_printings = []
	with open(os.path.join('lists', 'all-cards.txt'), encoding='utf-8-sig') as f:
		cards = f.read()
	cards = cards.split('\\n')
	for i in range(len(cards)):
		card_stats = cards[i].split('\t')
		if card_stats[0] == card_name and card_stats[3] == card_type and (card_stats[11] != code or card_stats[4] != card_num) and 'Token' not in card_type:
			other_printings.append(card_stats)
	if other_printings != []:
		html_content += '''<div class="printings" id="other-printings">Other Printings: '''
		for printing in other_printings:
			set_code = printing[11]
			html_content += '''<a href="/cards/''' + set_code + '''/''' + printing[4] + '''_''' + card_name_cleaned + '''">''' + set_code + '''</a>'''
			if printing != other_printings[len(other_printings) - 1]:
				html_content += ''' • '''
		html_content += '''</div>
		'''

	html_content += '''
	<script>
		let card_list_arrayified = [];
		let specialchars = "";

		document.addEventListener("DOMContentLoaded", async function () {
			'''

	with open(os.path.join('resources', 'snippets', 'load-files.txt'), encoding='utf-8-sig') as f:
		snippet = f.read()
		html_content += snippet

	html_content += '''
			await fetch('/cards/''' + code + '''/''' + card_num + '''_''' + card_name_cleaned + '''.txt')
				.then(response => response.text())
				.then(text => {
					card = text;
			}).catch(error => console.error('Error:', error));

			document.getElementById("grid").appendChild(gridifyCard(card));
			if (document.getElementById("other-printings"))
			{
				document.getElementById("card-text").appendChild(document.getElementById("other-printings"));			
			}
		});

		'''

	with open(os.path.join('resources', 'snippets', 'tokenize-symbolize.txt'), encoding='utf-8-sig') as f:
		snippet = f.read()
		html_content += snippet

	html_content += '''

		function gridifyCard(card) {
			card_stats = card.split('\\t');
			const card_name = card_stats[0];

		'''

	with open(os.path.join('resources', 'snippets', 'img-container-defs.txt'), encoding='utf-8-sig') as f:
		snippet = f.read()
		html_content += snippet

	html_content += '''

		document.getElementById("search").addEventListener("keypress", function(event) {
		  if (event.key === "Enter") {
				event.preventDefault();
				search();
		  }
		});

		function search() {
			window.location = ("/search?search=" + document.getElementById("search").value);
		}

		'''

	with open(os.path.join('resources', 'snippets', 'random-card.txt'), encoding='utf-8-sig') as f:
		snippet = f.read()
		html_content += snippet

	html_content += '''
	</script>
</body>
</html>'''

	# Write the HTML content to the output HTML file
	with open(output_html_file, 'w', encoding='utf-8-sig') as file:
		file.write(html_content)
		print(card_name + " HTML page written")
