import os
import sys

def generateHTML(card):
	code = card.split('\t')[11]
	card_name = card.split('\t')[0]
	with open(os.path.join('resources', 'replacechars.txt'), encoding='utf-8-sig') as f:
		chars = f.read()
	for char in chars:
		card_name = card_name.replace(char, '')
	card_num = card.split('\t')[4]
	output_html_file = "cards/" + code + "/" + card_num + "_" + card_name + ".html"

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
</style>
<body>
	<div class="header">
		<div class="search-grid">
			<a href="/"><img class="sg-logo" src="/img/banner.png"></a>
			<img class="sg-icon" src="/img/search.png">
			<input type="text" inputmode="search" placeholder="Search ..." name="search" id="search" spellcheck="false" autocomplete="off" autocorrect="off" spellcheck="false">
			<a href="/all-sets"><img src="/img/sets.png" class="sg-icon">Sets</a>
			<a onclick="randomCard()"><img src="/img/random.png" class="sg-icon">Random</a>
		</div>
	</div>

	<div class="banner-container">
		<a class="set-banner" id="set-banner" href="/sets/''' + code + '''">
			<img class="set-logo" src="/sets/''' + code + '''-files/icon.png">
			<div class="set-title">''' + set_name + '''</div>
		</a>
	</div>

	<div class="grid-container" id="grid">
	</div>

	<script>
		let card_list_arrayified = [];
		let specialchars = "";

		document.addEventListener("DOMContentLoaded", async function () {
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

			await fetch('/cards/''' + code + '''/''' + card_num + '''_''' + card_name + '''.txt')
				.then(response => response.text())
				.then(text => {
					card = text;
			}).catch(error => console.error('Error:', error));

			document.getElementById("grid").appendChild(gridifyCard(card));
		});

		function isDecimal(char) {
			return char >= '0' && char <= '9';
		}

		function tokenize(text) {
			let tokens = [];

			for (let i = 0; i < text.length; i++)
			{
				if (i < text.length - 1)
				{
					if (text[i + 1] == '/')
					{
						tokens.push(text.substring(i, i + 3));
						i = i + 2;
					}
					else if (isDecimal(text[i]) && isDecimal(text[i + 1]))
					{
						tokens.push(text.substring(i, i + 2));
						i = i + 1;
					}
					else
					{
						tokens.push(text[i]);
					}
				}
				else
				{
					tokens.push(text[i]);
				}
			}

			return tokens;
		}

		function symbolize(text) {
			let tokens = tokenize(text);
			let symText = "";
			for (const token of tokens)
			{
				symText = symText + "{" + token + "}";
			}

			return formatTextHTML(symText);
		}

		function formatTextHTML(str) {
			if(!str)
				return "";
			str = str.replace(/[{]([^}]+)[}]/g, function(matched, _1) {
				let letters = _1.toLowerCase().replace("/", "")
				return '<span class="mana mana-cost mana-' + letters + '"></span>';
			})
			return str;
		}

		function gridifyCard(card) {
			card_stats = card.split('\\t');
			const card_name = card_stats[0];

			const grid = document.createElement("div");
			grid.className = "image-grid";

			grid.appendChild(buildImgContainer(card_stats));
			
			const text = document.createElement("div");
			text.className = "card-text";

			const name_cost = document.createElement("div");
			name_cost.className = "name-cost";
			name_cost.innerHTML = card_stats[0] + (card_stats[6] != "" ? '     ' + symbolize(card_stats[6]) : "");
			text.appendChild(name_cost);

			const type = document.createElement("div");
			type.className = "type";
			type.textContent = card_stats[3];
			text.appendChild(type);

			const effect = document.createElement("div");
			effect.className = "effect";
			let card_effects = "";
			if (card_stats[7] != "")
			{
				card_effects = card_stats[7].split("NEWLINE");
			}
			else
			{
				card_effects = card_stats[9].split("NEWLINE");
			}
			effect.innerHTML += prettifyEffects(card_effects);
			text.appendChild(effect);

			if(card_stats[8] != "")
			{
				const pt = document.createElement("div");
				pt.className = "pt";
				pt.textContent = card_stats[8];
				text.appendChild(pt);
			}
			else if (card_stats[12] != "")
			{
				const loyalty = document.createElement("div");
				loyalty.className = "pt";
				loyalty.textContent = "[" + card_stats[12] + "]";
				text.appendChild(loyalty);
			}

			// 12-name	13-color	14-type	15-ci	16-cost	17-ability	18-pt	19-special-text	
			if(card_stats[10].includes("adventure") || card_stats[10].includes("double") || card_stats[10].includes("spli"))
			{
				const name_cost_2 = document.createElement("div");
				name_cost_2.className = "name-cost";
				name_cost_2.innerHTML = card_stats[13] + (card_stats[17] != "" ? '     ' + symbolize(card_stats[17]) : "");
				text.appendChild(name_cost_2);

				const type_2 = document.createElement("div");
				type_2.className = "type";
				type_2.textContent = card_stats[15];
				text.appendChild(type_2);

				const effect_2 = document.createElement("div");
				effect_2.className = "effect";
				let card_effects_2 = "";
				if (card_stats[18] != "")
				{
					card_effects_2 = card_stats[18].split("NEWLINE");
				}
				else
				{
					card_effects_2 = card_stats[20].split("NEWLINE");
				}
				effect_2.innerHTML += prettifyEffects(card_effects_2);
				text.appendChild(effect_2);

				if(card_stats[19] != "")
				{
					const pt_2 = document.createElement("div");
					pt_2.className = "pt";
					pt_2.textContent = card_stats[19];
					text.appendChild(pt_2);
				}
			}
			
			grid.appendChild(text);

			return grid;
		}

		function buildImgContainer(card_stats) {
			const imgContainer = document.createElement("div");
			imgContainer.className = "img-container";
			const id = card_stats[11] + "-" + card_stats[0];

			const img = document.createElement("img");
			img.className = "card-image";
			img.id = id;
			// (card_stats[13].includes("_") ? card_stats[13] : card_stats[0]) for posterity
			img.src = "/sets/" + card_stats[11] + "-files/img/" + card_stats[4] + (card_stats[3].includes("Token") ? "t_" : "_") + card_stats[0] + ((card_stats[10].includes("double")) ? "_front" : "") + ".png";
			imgContainer.appendChild(img);

			if (card_stats[10].includes("double"))
			{
				const imgFlipBtn = document.createElement("button");
				imgFlipBtn.className = "btn";
				imgFlipBtn.onclick = function() { imgFlip(id); };
				imgContainer.appendChild(imgFlipBtn);
			}

			return imgContainer;
		}

		function imgFlip(id) {
			cardToFlip = document.getElementById(id);
			cardName = cardToFlip.src;
			
			cardToFlip.src = cardName.includes("_front") ? cardName.replace("_front", "_back") : cardName.replace("_back", "_front");
		}

		function prettifyEffects(card_effects) {
			let HTML = "";

			for (let i = 0; i < card_effects.length; i++)
			{
				let styled_effect = card_effects[i].replaceAll("(","<i>(").replaceAll(")",")</i>");

				if (styled_effect.includes("—") && !styled_effect.toLowerCase().includes("choose"))
				{
					styled_effect = "<i>" + styled_effect.replace("—", "—</i>");
				}

				HTML += styled_effect;

				if (i != card_effects.length - 1)
				{
					HTML += "<br>"
				}
			}

			let pattern1 = /([0-9X]*[WUBRGCT/]+)([ :,\\.<]|$)/g;
			let pattern2 = /(?<![a-z] |\\/[0-9X]*)([0-9X]+)([:,]| <i>\\()/g;
			let pattern3 = /([Pp]ay[s]* |[Cc]ost[s]* |[Ww]ard )([0-9X])(?! life)/g;
			let pattern4 = /(Equip [^(<]*)([0-9XWUBRGC/]+)/g;
			let pattern5 = /( )([0-9X]+)( <i>\\()/g;
			let regexHTML = HTML.replace(pattern1, function (match, group1, group2) {
				return symbolize(group1) + group2;
			});
			regexHTML = regexHTML.replace(pattern2, function (match, group1, group2) {
				return symbolize(group1) + group2;
			});
			regexHTML = regexHTML.replace(pattern3, function (match, group1, group2) {
				return group1 + symbolize(group2);
			});
			regexHTML = regexHTML.replace(pattern4, function (match, group1, group2) {
				return group1 + symbolize(group2);
			});
			regexHTML = regexHTML.replace(pattern5, function (match, group1, group2, group3) {
				return group1 + symbolize(group2) + group3;
			});

			return regexHTML;
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
</html>'''

	# Write the HTML content to the output HTML file
	with open(output_html_file, 'w', encoding='utf-8-sig') as file:
		file.write(html_content)