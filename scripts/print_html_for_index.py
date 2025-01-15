import os
import sys

def generateHTML(set_codes):
	output_html_file = "index.html"

	# Start creating the HTML file content
	html_content = '''<html>
	<head>
		<title>MSE Set Hub</title>
		<link rel="icon" type="image/x-icon" href="/img/favicon.png">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
	</head>
	<style>
	@font-face {
	  font-family: 'Beleren Small Caps';
	  src: url('/resources/beleren-caps.ttf');
	}
	body {
		background-image: linear-gradient(to top, #ffdde1, #ee9ca7);
		background-attachment: fixed;
		overscroll-behavior: none;
		font-family: 'Helvetica', 'Arial', sans-serif;
		display: grid;
	}
	.selects {
		position: absolute;
	}
	.item-container {
		height: auto;
		display: grid;
		justify-self: center;
		align-self: center;
	}
	.item-container .banner {
		max-width: 500px;
		max-height: 200px;
		display: block;
		margin: auto;
		padding-bottom: 20px;
	}
	select {
		position: absolute;
		text-align: center;
		font-family: -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
		font-weight: 500;
		cursor: pointer;
		background-color: #F3F3F3;
	}
	input {
		width: 100%;
		max-width: 700px;
		margin: auto;
		height: 50px;
		font-size: 24px;
		color: #171717;
		background-color: #f3f3f3;
		border: 1px solid #d9d9d9;
		border-radius: 2px;
		padding-left: 10px;
		padding-right: 10px;
		-webkit-box-sizing: border-box;
		-moz-box-sizing: border-box;
		box-sizing: border-box;
	}
	input:focus {
		outline-color: #171717;
	}
	.two-part-grid {
		width: 100%;
		max-width: 700px;
		margin: auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		justify-items: center;
	}
	.two-part-grid p {
		width: 100%;
		text-align: center;
		padding-bottom: 8px;
		font-size: 24px;
		font-weight: bolder;
		font-family: 'Georgia';
		margin: 0;
	}
	.container p {
		padding-top: 11px;
		padding-bottom: 16px;
	}
	.preview-container {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2px;
		justify-items: center;
		align-items: center;
		padding-bottom: 20px;
	}
	.button-grid {
		display: grid;
		margin: auto;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		padding-top: 10px;
		padding-bottom: 20px;
	}
	.button-grid button {
		background-color: #171717;
		border: none;
		color: #f3f3f3;
		border-radius: 5px;
		cursor: pointer;
		font-size: 15px;
		width: 150px;
		height: 35px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
	}
	button:hover {
		background-color: #000000;
		border: 1px solid #f3f3f3;
	}
	.btn-img {
		width: 24px;
	}
	.container {
		height: fit-content;
		align-self: center;
	}
	.card-container {
		background: #f3f3f3;
		width: 90%;
		border: 1px solid #d5d9d9;
		border-top: 3px solid #171717;
		border-bottom: 3px solid #171717;
		border-radius: 6px;
		display: grid;
		justify-items: center;
		gap: 8px;
		padding-top: 8px;
		padding-bottom: 8px;
		height: fit-content;
	}
	.card-container p {
		border-bottom: 1px solid #898989;
	}
	.card-container a {
		width: 70%;
	}
	.card-container img {
		width: 100%;
		display: block;
		margin: auto;
	}
	.set-icon-container {
		font-family: 'Beleren Small Caps';
		font-size: 12px;
		text-align: center;
		display: grid;
		justify-items: center;
		align-items: center;
		gap: 2px;
		width: 100%;
		height: 100%;
	}
	.set-icon-container a {
		text-decoration: none;
		color: #171717;
	}
	.set-icon {
		height: 60px;
		display: grid;
		align-items: center;
		justify-items: center;
	}
	.set-icon img {
		width: 60px;
	}
	.set-icon-name {
		height: 30px;
	}
	@media ( max-width: 750px ) {
		.item-container {
			width: 95%;	
		}
		.search-grid {
			width: 95%;
		}
		.two-part-grid p {
			font-size: 18px;
		}
	}
	</style>
	<body>
		<div class="selects" id="selects">
			<select id="color-select" onchange="setGradient()">
			</select>
		</div>
		<div class="item-container">
			<img class="banner" src="img/banner.png"></img>
			<input type="text" inputmode="search" placeholder="Search ..." autofocus="autofocus" name="search" id="search" spellcheck="false" autocomplete="off" autocorrext="off" spellcheck="false">
			<div class="button-grid">
				<button onclick="goToSets()"><img src="/img/sets.png" class="btn-img">All Sets</button>
				<button onclick="randomCard()"><img src="/img/random.png" class="btn-img">Random Card</button>
			</div>
			<div class="two-part-grid">
				<div class="container" id="preview-container">
					<p>Preview Galleries</p>
					<div class="preview-container">
					'''

	for code in set_codes:
		if not os.path.exists(os.path.join('sets', code + '-files', 'ignore.txt')):
			with open(os.path.join('sets', code + '-files', code + '-fullname.txt'), encoding='utf-8-sig') as f:
				set_name = f.read()
			html_content += '''<div class="set-icon-container">
								<a href="''' + code + '''-spoiler"><div class="set-icon"><img src="sets/''' + code + '''-files/icon.png" title="''' + set_name + '''"></img></div>
								<div class="set-icon-name">''' + set_name + '''</div></a>
							</div>
			'''

	html_content += '''				</div>
				</div>
				<div class="card-container" id="cotd-image">
					<p>Card of the Day</p>
				</div>
			</div>
		</div>
		<script>
			const delay = ms => new Promise(res => setTimeout(res, ms));
			let gradients = [];
			let card_list_arrayified = [];
			let specialchars = "";

			document.addEventListener("DOMContentLoaded", async function () {
				try {
					const response = await fetch('./resources/gradients.txt');
					raw_gradients = await response.text();
				}
				catch(error) {
					console.error('Error:', error);
				}

				gradients = raw_gradients.split('\\n');
				prepareGradients();

				'''

	with open(os.path.join('resources', 'snippets', 'load-files.txt'), encoding='utf-8-sig') as f:
		snippet = f.read()
		html_content += snippet

	html_content += '''
				card_list_cleaned = [];

				for (const card of card_list_arrayified)
				{
					let card_stats = [];

					for (let i = 0; i < card.length; i++)
					{
						card_stats.push(card[i].toLowerCase());
					}

					if (!card_stats[10].includes("token") && !card_stats[3].includes("basic"))
					{
						card_list_cleaned.push(card);
					}
				}

				const cotd = reallyRand(card_list_cleaned.length);
				const card_stats = card_list_cleaned[cotd];

				const a = document.createElement("a");
				let card_name = card_stats[0];
				for (const char of specialchars)
				{
					card_name = card_name.replaceAll(char, "");
				}
				a.href = '/cards/' + card_stats[11] + '/' + card_stats[4] + '_' + card_name;

				const img = document.createElement("img");
				img.id = "cotd";


				img.src = '/sets/' + card_stats[11] + '-files/img/' + card_stats[4] + '_' + card_stats[0] + (card_stats[10].includes('double') ? '_front' : '') + '.png';

				a.append(img);
				document.getElementById("cotd-image").append(a);

				do {
					await delay(100);
				}
				while (!isImageOk(document.getElementById("cotd")));
				document.getElementById("preview-container").style.height = document.getElementById("cotd-image").offsetHeight;
			});

			document.getElementById("search").addEventListener("keypress", function(event) {
				if (event.key === "Enter") {
					event.preventDefault();
					search();
				}
			});

			window.addEventListener('resize', function(event) {
				document.getElementById("preview-container").style.height = document.getElementById("cotd-image").offsetHeight;
			}, true);

			function isImageOk(img) {
				if (!img.complete || img.naturalWidth == 0) {
					return false;
				}

				return true;
			}

			// if this doesn't work, blame Gemini
			function reallyRand(x) {
				const date = new Date();
				const seed = date.getFullYear() * 10000 + 
							 date.getMonth() * 100 + 
							 date.getDate();

				const a = 1103515245;
				const c = 12345;
				const m = Math.pow(2, 31);

				let randomNumber = (a * seed + c) % m;
				randomNumber = randomNumber / m;

				return Math.floor(randomNumber * x);
			}

			function prepareGradients() {
				for (const gradient of gradients)
				{
					gradientStats = gradient.split('\\t');

					const opt = document.createElement("option");
					opt.value = gradientStats[0].replace(' ', '-');
					opt.text = gradientStats[0];
					document.getElementById("color-select").appendChild(opt);
				}

				setGradient();
			}

			function setGradient() {
				gradient = document.getElementById("color-select").value;

				gradTop = "#000000";
				gradBottom = "#FFFFFF";
				for (const grad of gradients)
				{
					gradientStats = grad.split('\\t');
					if (gradient == gradientStats[0].replace(' ', '-'))
					{
						gradTop = gradientStats[1];
						gradBottom = gradientStats[2];
					}
				}

				document.body.style.backgroundImage = `linear-gradient(to bottom, ${gradTop}, ${gradBottom})`;
			}

			function goToSets() {
				window.location = ("/all-sets");
			}

			function search() {
				window.location = ("search?search=" + document.getElementById("search").value);
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

	print(f"HTML file saved as {output_html_file}")
