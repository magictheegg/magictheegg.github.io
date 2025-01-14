import os
import sys

def generateHTML(codes):
	output_html_file = "all-sets.html"

	# Start creating the HTML file content
	html_content = '''<html>
	<head>
	  <title>All Sets</title>
	  <link rel="icon" type="image/x-icon" href="/img/sets.png">
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
			font-size: 20px;
		}
		a {
			text-decoration: none;
			color: #171717;
		}
		.set-table {
			width: 60%;
			max-width: 1000px;
			display: grid;
			grid-template-columns: 1fr;
			padding-top: 80px;
			padding-bottom: 40px;
			margin: auto;
		}
		.set-header-row {
			width: 100%;
			display: grid;
			grid-template-columns: 0.5fr 2.5fr 0.5fr 0.5fr;
			gap: 5px;
			font-weight: bold;
			padding-bottom: 10px;
		}
		.set-row {
			height: 6em;
			width: 100%;
			display: grid;
			grid-template-columns: 0.5fr 2.5fr 0.5fr 0.5fr;
			gap: 5px;
			align-items: center;
			border-top: 1px solid #171717;
		}
		.set-row:hover {
			background-color: #fafafa;
		}
		.set-row:nth-child(2n) {
		  background-color: #dedede;
		}
		.set-row:nth-child(2n):hover {
			background-color: #e6e6e6;
		}
		.set-row img {
			width: 70%;
			justify-self: center;
		}
		.set-title {
			font-family: Beleren;
			letter-spacing: .02em;
			font-size: 22px;
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
		<div class="set-table">
		<div class="set-header-row">
			<div></div> <!-- empty div for spacing -->
			<div>NAME</div>
			<div>CODE</div>
			<div>CARDS</div>
		</div>
	'''

	for code in codes:
		with open(os.path.join('sets', code + '-files', code + '-fullname.txt'), encoding='utf-8-sig') as f:
			set_name = f.read()
		html_content += '''
		<a href="/sets/''' + code + '''" class="set-row"> 
			<img src="/sets/''' + code + '''-files/icon.png">
			<div class="set-title">''' + set_name + '''</div>
			<div>''' + code + '''</div>
			<div>''' + str(len(os.listdir(os.path.join('cards', code))) // 2) + '''</div>
		</a>
		'''

	html_content += '''
		</div>
	<script>
		let card_list_arrayified = [];
		let specialchars = "";
		let displayStyle = "";

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
		});

		function isDecimal(char) {
			return char >= '0' && char <= '9';
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
	with open(output_html_file, 'w') as file:
		file.write(html_content)

	print(f"HTML file saved as {output_html_file}")