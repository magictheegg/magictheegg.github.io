import os
import sys

def generate_html(img_dir, output_html_file):
	script_dir = os.path.dirname(os.path.realpath(__file__))

	with open(os.path.join('lists', 'set-codes.txt')) as f:
		set_codes = f.read()
	set_codes = set_codes.split('\n')

	# Start creating the HTML file content
	html_content = '''<html>
	<head>
		<title>MSE Set Hub</title>
		<link rel="icon" type="image/x-icon" href="/img/index-favicon.png">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
	</head>
	<style>
	body {
	  background-image: linear-gradient(to top, #ffdde1, #ee9ca7);
	  overscroll-behavior: none;
	  font-family: 'Helvetica', 'Arial', sans-serif;
	}
	.item-container {
	  	width: 70%;
	  	height: auto;
	  	position: fixed;
	  	left: 50%;
	  	top: 50%;
	  	transform: translate(-50%, -50%);
	}
	.item-container .banner {
	  	width: 100%;
	  	max-width: 500px;
	  	display: block;
	  	margin: auto;
	}
	select {
		text-align: center;
		font-family: -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
		font-weight: 500;
		cursor: pointer;
		background-color: #F3F3F3;
	}
	/* courtesy of https://getcssscan.com/css-buttons-examples */
	button {
		width: 100%;
		height: auto;
		font-size: 16px;
		appearance: none;
		background-color: #F3F3F3;
		border: 1px #808080 solid;
		border-radius: 6px;
		box-shadow: rgba(27, 31, 35, 0.04) 0 1px 0, rgba(255, 255, 255, 0.25) 0 1px 0 inset;
		box-sizing: border-box;
		color: #24292E;
		cursor: pointer;
		display: inline-block;
		font-family: -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
		font-weight: 500;
		line-height: 20px;
		list-style: none;
		padding: 6px 16px;
		/*position: relative;*/
		transition: background-color 0.2s cubic-bezier(0.3, 0, 0.5, 1);
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
		vertical-align: middle;
		white-space: nowrap;
		word-wrap: break-word;
	}
	button:hover {
	  background-color: #F3F4F6;
	  text-decoration: none;
	  transition-duration: 0.1s;
	}
	button:disabled {
	  background-color: #FAFBFC;
	  border-color: rgba(27, 31, 35, 0.15);
	  color: #959DA5;
	  cursor: default;
	}
	button:active {
	  background-color: #EDEFF2;
	  box-shadow: rgba(225, 228, 232, 0.2) 0 1px 0 inset;
	  transition: none 0s;
	}
	button:focus {
	  outline: 1px transparent;
	}
	button:before {
	  display: none;
	}
	button:-webkit-details-marker {
	  display: none;
	}
	.search-grid {
		width: 80%;
		height: 40px;
		margin: auto;
		display: grid;
		grid-template-columns: 4fr 1fr;
		gap: 10px;
		padding-top: 10px;
		justify-items: center;
	}
	.search-grid input {
	    width: 100%;
	    font-size: 16px;
	}
	.two-part-grid {
		display: grid;
		grid-template-columns: 3fr 4fr;
		gap: 5px;
		justify-items: center;
		align-items: flex-start;
	}
	.two-part-grid p {
		font-size: 24px;
		font-weight: bolder;
		font-family: 'Georgia';
	}
	.two-part-grid img {
		width: 60%;
		display: block;
	  	margin: auto;
	}
	.icon-bar {
	    display: grid;
	    grid-template-columns: 1fr 1fr;
	    gap: 1px;
	    padding-left: 5%;
	    padding-right: 5%;
	    padding-top: 2%;
	    padding-bottom: 1%;
	    justify-items: center;
	    align-items: center;
	}
	.icon-bar .icon img {
	    width: 60%;
	    height: auto;
	    display: block;
	    padding: 5%;
	    margin: auto;
	    text-align: center;
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
			<img class="banner" src="img/eggverse-banner.png"></img>
			<div class="search-grid">
				<input type="text" placeholder="Search ..." name="search" id="search" spellcheck="false" autocomplete="off" autocorrext="off" spellcheck="false">
				<button type="submit" onclick="search()" id="searchBtn">Search</button>
			</div>
			<div class="two-part-grid">
				<p>Preview Galleries</p>
				<p>Random Card of the Day</p>
			</div>
			<div class="two-part-grid">
				<div class="icon-bar">
					'''

	for s in set_codes:
		set_stats = s.split('\t')
		html_content += '''					<div class="icon"><a href="''' + set_stats[0] + '''_spoiler.html"><img src="img/''' + set_stats[0] + '''/icon.png" title="''' + set_stats[1] + '''"></img></a></div>
		'''

	html_content += '''	    	</div>
		    	<div id="cotd-image"></div>
		    </div>
		</div>
		<script>
			let gradients = [];

			document.addEventListener("DOMContentLoaded", async function () {
				try {
					const response = await fetch('./lists/gradients.txt');
					raw_gradients = await response.text();
				}
				catch(error) {
					console.error('Error:', error);
				}

				gradients = raw_gradients.split('\\n');
				prepareGradients();

	            // this is all to prepare a random card of the day lol
	            await fetch('./lists/all-cards.txt')
	                .then(response => response.text())
	                .then(text => {
	                    // Do something with the text content
	                    card_list_stringified = text; 
	            }).catch(error => console.error('Error:', error));

	            card_list_arrayified = card_list_stringified.split('\\\\n');
	            card_list_cleaned = []

	            for (const card of card_list_arrayified)
	            {
	            	let card_stats = [];

					for (let i = 0; i < card.length; i++)
					{
						card_stats.push(card[i].toLowerCase());
					}

					if (!card_stats[3].includes("token") && !card_stats[3].includes("basic"))
					{
						card_list_cleaned.push(card);
					}
	            }

	            const cotd = reallyRand(card_list_cleaned.length);
	            const card_stats = card_list_cleaned[cotd].split('\\t');
	            const img = document.createElement("img");
	            img.src = 'img/' + card_stats[11] + '/' + card_stats[0] + '.png';
	            document.getElementById("cotd-image").append(img);
	        });

			document.getElementById("search").addEventListener("keypress", function(event) {
			  if (event.key === "Enter") {
				event.preventDefault();
				document.getElementById("searchBtn").click();
			  }
			});

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

			function search() {
				window.location = ("search.html?search=" + document.getElementById("search").value);
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
		</script>
	</body>
	</html>'''

	# Write the HTML content to the output HTML file
	with open(output_html_file, 'w') as file:
		file.write(html_content)

	print(f"HTML file saved as {output_html_file}")

container_dir = os.path.dirname(os.path.realpath(__file__))[:-8] # Minus '/scripts'
img_dir = container_dir + "/img/" # Relative to this script (can be made point to the same directory as input_directory)
output_html_file = container_dir + "/index_tmp.html" # Relative to this script
generate_html(img_dir, output_html_file)