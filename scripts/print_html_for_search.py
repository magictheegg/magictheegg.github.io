import os
import sys

codes = [ 'SHF', 'GSS', 'KND', 'NJB' ]
#codes = [ 'NJB' ]

def generate_html(img_dir, output_html_file):

	script_dir = os.path.dirname(os.path.realpath(__file__))
	
	file_input = ''
	for set_code in codes:
		with open(os.path.join(script_dir, 'lists', set_code + '-raw.txt')) as f:
			raw = f.read()
			file_input += raw.replace('\n','NEWLINE').replace('REPLACEME','\\n')
	file_input = file_input.rstrip('\\n')

	with open(os.path.join(script_dir, 'lists', 'all-cards.txt'), 'w') as f:
		f.write(file_input);

	# Start creating the HTML file content
	html_content = '''<html>
<head>
  <title>Search</title>
</head>
<style>
	body {
		font-family: 'Helvetica', 'Arial', sans-serif;
	}
	.search-grid {
		width: 80%;
		height: 40px;
		margin: auto;
		display: grid;
		grid-template-columns: 4fr 1fr;
		gap: 10px;
		padding-top: 30px;
		justify-items: center;
	}
	.button-grid {
		width: 80%;
		height: 40px;
		margin: auto;
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr;
		gap: 10px;
		padding-top: 10px;
		padding-bottom: 40px;
		justify-items: center;
	}
	.prev-next-btns {
		width: 100%;
		height: 40px;
		margin: auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 5px;
	}
	.search-grid input {
		width: 100%;
		font-size: 16px;
	}
	.search-grid button {
		width: 100%;
		height: auto;
		font-size: 16px;
	}
	.button-grid .results-text {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.button-grid select {
		width: 100%;
		font-size: 16px;
		text-align: center;
	}
	.button-grid button {
		width: 100%;
		height: auto;
		font-size: 16px;
	}
	.prev-next-btns button {
		width: 100%;
		height: auto;
		font-size: 16px;
	}
	.grid-container {
		display: grid;
		grid-template-columns: auto;
	}
	.image-grid-container {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr;
		width: 70%;
		margin: auto;
		gap: 5px;
		justify-items: center;
		padding-bottom: 10px;
	}
	@media ( max-width: 750px ) {
	  .image-grid-container {
	    	grid-template-columns: 1fr 1fr;  
		}
	}
	.image-grid {
		width: 70%;
		margin: auto;
		display: grid;
		grid-template-columns: minmax(150px, 1fr) minmax(300px, 2fr);
		gap: 50px;
		padding-bottom: 10px;
		justify-items: left;
	}
	.image-grid img {
		position: relative;
		top: 50%;
		left: 50%;
		transform: translate(-50%,-50%);
	}
	.card-image {
		float: left;
		width: 100%;
		height: auto;
		display: block;
	}
	.card-text {
		padding-top: 20px;
		padding-bottom: 20px;
	}
	.card-text div {
		white-space: normal;
		font-size: 15px;
		padding-bottom: 10px;
		line-height: 155%;
	}
	.card-text .name-cost {
		font-weight: bold;
		font-size: 20px;
	}
	.card-text .type {
		font-size: 16px;
	}
	.card-text .pt {
		font-weight: bold;
		padding-bottom: 0px;
	}
	.card-text br {
		content: "";
		display: block;
		margin-bottom: 5px;
	}
</style>
<body>
	<div class="search-grid">
		<input type="text" placeholder="Search ..." name="search" id="search" spellcheck="false" autocomplete="off" autocorrext="off" spellcheck="false">
		<button type="submit" onclick="search(true)" id="searchBtn">Search</button>
	</div>
	<div class="button-grid">
		<div class="results-text" id="results-text">Loading ...</div>
		<select name="sort-by" id="sort-by"><option value="set-code">Set Code / Number</option><option value="name">Name</option><option value="mv">Mana Value</option><option value="color">Color</option></select>
		<select name="display" id="display"><option value="cards-text">Cards + Text</option><option value="cards-only">Cards Only</option></select>
		<div class="prev-next-btns">
			<button type="submit" onclick="previousPage()" id="prevBtn" disabled>< Previous</button>
			<button type="submit" onclick="nextPage()" id="nextBtn">Next 30 ></button>
		</div>
	</div>

	<div class="grid-container" id="grid">
	</div>

	<div class="image-grid-container" id="imagesOnlyGrid">
	</div>

	<div class="button-grid">
		<div></div>
		<div></div>
		<div></div>
		<div class="prev-next-btns">
			<button type="submit" onclick="previousPage()" id="prevBtn-footer" disabled>< Previous</button>
			<button type="submit" onclick="nextPage()" id="nextBtn-footer">Next 30 ></button>
		</div>
	</div>

	<script>
        let duplicates = [];
        let page = 0;
        let pageCount = 30;
        let search_results = [];
        let card_list_arrayified = [];

		document.addEventListener("DOMContentLoaded", async function () {
			await fetch('./scripts/lists/all-cards.txt')
                .then(response => response.text())
                .then(text => {
                    // Do something with the text content
                    card_list_stringified = text; 
            }).catch(error => console.error('Error:', error));

            card_list_arrayified = card_list_stringified.split('\\\\n');

            for (let i = 0; i < card_list_arrayified.length; i++)
            {
                card_list_arrayified[i] = card_list_arrayified[i].split('\t');
                for (let j = 0; j < i; j++)
                {
                    if (card_list_arrayified[i][0] == card_list_arrayified[j][0] && card_list_arrayified[i][11] == card_list_arrayified[j][11])
                    {
                        duplicates.push(card_list_arrayified[i][0] + card_list_arrayified[i][11]);
                    }
                }
            }
            for (let i = 0; i < card_list_arrayified.length; i++)
            {
                let tag = 97; // a
                let card_name = card_list_arrayified[i][0];
                let set_code = card_list_arrayified[i][11];

                for (let j = 0; j < i; j++)
                {
                    if (card_name == card_list_arrayified[j][0] && set_code == card_list_arrayified[j][11])
                    {
                        tag++;
                    }
                }

                card_list_arrayified[i].push(duplicates.includes(card_name + set_code) ? (card_name + "_" + String.fromCharCode(tag)) : "");
            }

			if (sessionStorage.getItem("display") == "cards-only")
			{
				cardGrid = document.getElementById("imagesOnlyGrid");
			}
			else
			{
				cardGrid = document.getElementById("grid");
			}

			card_list_arrayified.sort(compareFunction);

			page = window.location.href.indexOf("page=") == -1 ? 0 : parseInt(window.location.href.substring(window.location.href.indexOf("page=") + 5)) - 1;

			// refresh page values
			let params = decodeURIComponent(window.location.href.indexOf("?search") == -1 ? "" : window.location.href.substring(window.location.href.indexOf("?search") + 8));
  			document.getElementById("search").value = (params.indexOf("&page=") == -1 ? params.replaceAll("+", " ") : params.substring(0, params.indexOf("&page=")).replaceAll("+", " "));
  			if (sessionStorage.getItem("sortMethod"))
  			{
	  			document.getElementById("sort-by").value = sessionStorage.getItem("sortMethod");  			
  			}
  			if (sessionStorage.getItem("display"))
  			{
	  			document.getElementById("display").value = sessionStorage.getItem("display");  			
  			}

  			displayStyle = document.getElementById("display").value;
  			imagesOnlyGrid.style.display = displayStyle == "cards-only" ? '' : 'none';
  			grid.style.display = displayStyle == "cards-only" ? 'none' : '';

  			// initial search on load
			search(false);
		});

		document.getElementById("sort-by").onchange = sortChangeListener;
  
  		function sortChangeListener() {
  			sessionStorage.setItem("sortMethod", document.getElementById("sort-by").value);
  			search(false);
  		}

  		document.getElementById("display").onchange = displayChangeListener;
  
  		function displayChangeListener() {
  			displayStyle = document.getElementById("display").value;
  			sessionStorage.setItem("display", displayStyle);

  			imagesOnlyGrid.style.display = displayStyle == "cards-only" ? '' : 'none';
  			grid.style.display = displayStyle == "cards-only" ? 'none' : '';

  			search(false);
  		}

  		window.addEventListener('popstate', function(event) {
  			let params = decodeURIComponent(window.location.href.indexOf("?search") == -1 ? "" : window.location.href.substring(window.location.href.indexOf("?search") + 8), (window.location.href.indexOf("page=") == -1 ? window.location.href.length : window.location.href.indexOf("page=")));
			document.getElementById("search").value = (params.indexOf("&page=") == -1 ? params.replaceAll("+", " ") : params.substring(0, params.indexOf("&page=")).replaceAll("+", " "));
			page = window.location.href.indexOf("page=") == -1 ? 0 : parseInt(window.location.href.substring(window.location.href.indexOf("page=") + 5)) - 1;

			search(false);
		});

		function compareFunction(a, b) {
			const sortMode = document.getElementById("sort-by").value;
			
			if (sortMode == 'set-code')
			{
				if (a[11] === b[11])
				{
					if (a[4] === b[4])
					{
						return 0;
					}
					else {
						return (parseInt(a[4]) < parseInt(b[4])) ? -1 : 1;
					}
				}
				else {
					return (a[11] < b[11]) ? -1 : 1;
				}
			}
			if (sortMode == 'name')
			{
				if (a[0] === b[0])
				{
					return 0;
				}
				else {
					return (a[0] < b[0]) ? -1 : 1;
				}
			}
			if (sortMode == 'mv')
			{
				a_mv = isDigit(a[6].charAt(0)) ? parseInt(a[6]) + a[6].replaceAll('x','').length - 1 : a[6].replaceAll('x','').length;
				b_mv = isDigit(b[6].charAt(0)) ? parseInt(b[6]) + b[6].replaceAll('x','').length - 1 : b[6].replaceAll('x','').length;
				if (a_mv === b_mv)
				{
					if (a[0] === b[0])
					{
						return 0;
					}
					else {
						return (a[0] < b[0]) ? -1 : 1;
					}
				}
				else {
					return (a_mv < b_mv) ? -1 : 1;
				}
			}
			if (sortMode == 'color')
			{
				color_sort_order = ["W", "U", "B", "R", "G", "WU", "UB", "BR", "RG", "GW", "WB", "UR", "BG", "RW", "GU", "WUB", "UBR", "BRG", "RGW", "GWU", "RWB", "GUR", "WBG", "URW", "BGU", "WUBR", "UBRG", "BRGW", "RGWU", "GWUB", "WUBRG", ""];
				a_color_index = -1;
				b_color_index = -1;

				for (let i = 0; i < color_sort_order.length; i++)
				{
					if (a[1].toLowerCase().split('').sort().join('') == color_sort_order[i].toLowerCase().split('').sort().join(''))
					{
						a_color_index = i;
					}
					if (b[1].toLowerCase().split('').sort().join('') == color_sort_order[i].toLowerCase().split('').sort().join(''))
					{
						b_color_index = i;
					}
				}

				if (a_color_index === b_color_index)
				{
					if (a[0] === b[0])
					{
						return 0;
					}
					else {
						return (a[0] < b[0]) ? -1 : 1;
					}
				}
				else {
					return (a_color_index < b_color_index) ? -1 : 1;
				}
			}
		}

		function search(setNewState) {
			searchTerms = document.getElementById("search").value;

			card_list_arrayified.sort(compareFunction);
			search_results = [];
			page = setNewState ? 0 : page;

			if (searchTerms != "")
			{
				if (setNewState)
				{
					let url = (window.location.href.indexOf("?") == -1 ? new URL(window.location.href) : new URL(window.location.href.substring(0, window.location.href.indexOf("?"))));
					let params = new URLSearchParams(url.search);
					params.append("search", searchTerms);
					history.pushState({}, '', url.pathname + '?' + params.toString());
				}
				oracleSplitRegex = /[^"“”\/() ]*["“\/(][^"“”\/()]+["”\/)]|[^\s]+/g,
				searchTokens = searchTerms.toLowerCase().match(oracleSplitRegex).map(e => e.replace(/"(.+)"/, "$1"));
			}
			else
			{
				searchTokens = "";

				if (setNewState)
				{
					let url = (window.location.href.indexOf("?") == -1 ? new URL(window.location.href) : new URL(window.location.href.substring(0, window.location.href.indexOf("?"))));
					let params = new URLSearchParams(url.search);
					params.delete("search");
					history.pushState({}, '', url.pathname + '' + params.toString());
				}
			}

			if (sessionStorage.getItem("display") == "cards-only")
			{
				cardGrid = document.getElementById("imagesOnlyGrid");
			}
			else
			{
				cardGrid = document.getElementById("grid");
			}
			cardGrid.innerHTML = "";

			for (const card of card_list_arrayified) {
				let searched = true;
				let card_stats = [];

				for (let i = 0; i < card.length; i++)
				{
					card_stats.push(card[i].toLowerCase());
				}

				const card_name = card_stats[0];
				const card_mv = isDigit(card_stats[6].charAt(0)) ? parseInt(card_stats[6]) + card_stats[6].replaceAll('x','').length - 1 : card_stats[6].replaceAll('x','').length;
				const card_color = card_stats[1] != "" ? card_stats[1] : "c";
				const card_ci = card_stats[5];
				const card_type = card_stats[3];
				const card_oracle_text = card_stats[7] != "" ? card_stats[7].replaceAll("NEWLINE", '\\n') : card_stats[9].replaceAll("NEWLINE", '\\n');
				const card_power = card_stats[8].substring(0,card_stats[8].indexOf('/'));
				const card_toughness = card_stats[8].substring(card_stats[8].indexOf('/')+1);
				const card_rarity = card_stats[2];
				const card_set = card_stats[11];

				// availableTokens = ["mv", "c", "ci", "t", "o", "pow", "tou", "r", "is"]

				if (card_type.includes("token") && !searchTokens.includes("t:token"))
				{
					continue;
				}

				if (card_type.includes("basic") && !searchTokens.includes("t:basic"))
				{
					continue;
				}

				for (let token of searchTokens)
				{
					if (token.charAt(0) == '(')
					{
						let parenSearched = false;
						let parenSearchTokens = token.substring(1, token.length - 1).split(" or ");

						for (let parenToken of parenSearchTokens)
						{
							if (parenToken.charAt(0) == '-')
							{
								if (!searchToken(parenToken.substring(1), card_name, card_mv, card_color, card_ci, card_type, card_oracle_text, card_power, card_toughness, card_rarity, card_set))
								{
									parenSearched = true;
								}
							}
							else
							{
								if (searchToken(parenToken, card_name, card_mv, card_color, card_ci, card_type, card_oracle_text, card_power, card_toughness, card_rarity, card_set))
								{
									parenSearched = true;
								}
							}
						}

						searched = (searched && parenSearched);
					}
					else if (token.charAt(0) == '-')
					{
						searched = (searched && !searchToken(token.substring(1), card_name, card_mv, card_color, card_ci, card_type, card_oracle_text, card_power, card_toughness, card_rarity, card_set));
					}
					else
					{
						searched = (searched && searchToken(token, card_name, card_mv, card_color, card_ci, card_type, card_oracle_text, card_power, card_toughness, card_rarity, card_set));
					}

					if (!searched)
					{
						break;
					}
				}

				if (searched)
				{
					search_results.push(card);
				}
			}

			if (searchTerms != "")
			{
				document.getElementById("results-text").innerText = search_results.length + " results found.";
			}
			else
			{
				document.getElementById("results-text").innerText = "";
			}

			if (page != 0)
			{
				document.getElementById("prevBtn").disabled = false;
				document.getElementById("prevBtn-footer").disabled = false;
			}
			else
			{
				document.getElementById("prevBtn").disabled = true;
				document.getElementById("prevBtn-footer").disabled = true;
			}

			// set text of Next to match number of displayed images
			displayStyle = document.getElementById("display").value;
  			pageCount = displayStyle == "cards-only" ? 60 : 30;
  			document.getElementById("nextBtn").innerText = "Next " + pageCount + " >";
  			document.getElementById("nextBtn-footer").innerText = "Next " + pageCount + " >";

  			// really awesome code block to fix the URL when switching from Cards + Text view to Cards Only view
  			while ((pageCount * page) > search_results.length)
  			{
  				page = page - 1;

  				let url = (window.location.href.indexOf("page=") == -1 ? new URL(window.location.href) : new URL(window.location.href.substring(0, window.location.href.indexOf("page="))));
				let params = new URLSearchParams(url.search);
				params.append("page", page+1);
				history.replaceState({}, '', url.pathname + '?' + params.toString());
  			}

			for (let i = (pageCount * page); i < Math.min((pageCount * (page + 1)), search_results.length); i++)
			{
				cardGrid.appendChild(gridifyCard(search_results[i]));

				if (search_results.length <= (pageCount * (page + 1)))
				{
					document.getElementById("nextBtn").disabled = true;
					document.getElementById("nextBtn-footer").disabled = true;
				}
				else
				{
					document.getElementById("nextBtn").disabled = false;
					document.getElementById("nextBtn-footer").disabled = false;
				}
			}
		}

		function searchToken(token, card_name, card_mv, card_color, card_ci, card_type, card_oracle_text, card_power, card_toughness, card_rarity, card_set)
		{
			token = token.replaceAll("~", card_name).replaceAll("cardname", card_name);
			let flip = false;

			const modifierRegex = /[!:<>=]/;
			const match = token.search(modifierRegex);

			if (match > -1)
			{
				const term = token.substring(0, match);
				const modifier = token.charAt(match);
				const check = token.substring(match + 1);

				/* template
				if (term == "mv")
				{
					if (modifier == "!" || modifier == "=")
					{

					}
					else if (modifier == ":")
					{

					}
					else if (modifier == "<")
					{

					}
					else if (modifier == ">")
					{

					}
				} */
				if (term == "mv")
				{
					if (modifier == "!" || modifier == "=")
					{
						return (card_mv == check);
					}
					else if (modifier == ":")
					{
						return (card_mv == check);
					}
					else if (modifier == "<")
					{
						return (card_mv < check);
					}
					else if (modifier == ">")
					{
						return (card_mv > check);
					}
				}
				if (term == "c")
				{
					if (modifier == "!" || modifier == "=")
					{
						return (card_color.split("").sort().join("") == check.split("").sort().join(""));
					}
					else if (modifier == ":")
					{
						return hasAllChars(card_color, check);
					}
					else if (modifier == "<")
					{
						return hasNoChars(card_color, check);
					}
					else if (modifier == ">")
					{
						return hasAllAndMoreChars(card_color, check);
					}
				}
				if (term == "ci")
				{
					if (modifier == "!" || modifier == "=")
					{
						return (card_ci.split("").sort().join("") == check.split("").sort().join(""));
					}
					else if (modifier == ":")
					{
						return hasAllChars(card_ci, check);
					}
					else if (modifier == "<")
					{
						return hasNoChars(card_ci, check);
					}
					else if (modifier == ">")
					{
						return hasAllAndMoreChars(card_ci, check);
					}
				}
				if (term == "t" || term == "type")
				{
					if (modifier == ":")
					{
						return card_type.includes(check);
					}
					/* unsupported flows
					if (modifier == "!" || modifier == "=")
					{

					}
					else if (modifier == "<")
					{

					}
					else if (modifier == ">")
					{

					} */
				}
				if (term == "o")
				{
					if (modifier == ":")
					{
						if (check.charAt(0) == '/')
						{
							regex = new RegExp(check.substring(1,check.length - 1));
							return regex.test(card_oracle_text);
						}
						else
						{
							return card_oracle_text.includes(check);
						}
					}
					/* unsupported flows
					if (modifier == "!" || modifier == "=")
					{

					}
					else if (modifier == "<")
					{

					}
					else if (modifier == ">")
					{

					} */
				}
				if (term == "pow")
				{
					if (modifier == "!" || modifier == "=")
					{
						return (card_power == check);
					}
					else if (modifier == ":")
					{
						return (card_power == check);
					}
					else if (modifier == "<")
					{
						return (card_power < check);
					}
					else if (modifier == ">")
					{
						return (card_power > check);
					}
				}
				if (term == "tou")
				{
					if (modifier == "!" || modifier == "=")
					{
						return (card_toughness == check);
					}
					else if (modifier == ":")
					{
						sreturn (card_toughness == check);
					}
					else if (modifier == "<")
					{
						return (card_toughness < check);
					}
					else if (modifier == ">")
					{
						return (card_toughness > check);
					}
				}
				if (term == "r")
				{
					if (modifier == ":")
					{
						return (card_rarity == check);
					}
					/* unsupported flows
					if (modifier == "!" || modifier == "=")
					{

					}
					else if (modifier == "<")
					{

					}
					else if (modifier == ">")
					{

					} */
				}
				if (term == "e")
				{
					if (modifier == ":")
					{
						return (card_set == check);
					}
					/* unsupported flows
					if (modifier == "!" || modifier == "=")
					{

					}
					else if (modifier == "<")
					{

					}
					else if (modifier == ">")
					{

					} */
				}
				if (term == "is")
				{
					if (modifier == ":")
					{
						// all of these are implemented individually
						if (check == "permanent")
						{
							return !card_type.includes("instant") && !card_type.includes("sorcery");
						}
						if (check == "spell")
						{
							return !card_type.includes("land");
						}
						if (check == "commander")
						{
							return (card_type.includes("legendary") && card_type.includes("creature")) || card_oracle_text.includes("can be your commander");
						}
					}
					/* unsupported flows
					if (modifier == "!" || modifier == "=")
					{

					}
					else if (modifier == "<")
					{

					}
					else if (modifier == ">")
					{

					} */
				}
			}

			return card_name.includes(token);
		}

		function gridifyCard(card_stats) {
			const displayStyle = sessionStorage.getItem("display");
			const card_name = card_stats[0];

			if (displayStyle == "cards-only")
			{
				const img = document.createElement("img");
				img.className = "card-image";
				img.src = "img/" + card_stats[11] + "/" + (card_stats[12] != "" ? card_stats[12] : card_name) + ((card_stats[10].includes("double")) ? "_front" : "") + ".png";
				return img;
			}

			const grid = document.createElement("div");
			grid.className = "image-grid";

			const img = document.createElement("img");
			img.className = "card-image";
			img.src = "img/" + card_stats[11] + "/" + (card_stats[12] != "" ? card_stats[12] : card_name) + ((card_stats[10].includes("double")) ? "_front" : "") + ".png";
			grid.appendChild(img);
			
			const text = document.createElement("div");
			text.className = "card-text";

			const name_cost = document.createElement("div");
			name_cost.className = "name-cost";
			name_cost.textContent = card_stats[0] + (card_stats[6] != "" ? '\xa0\xa0\xa0\xa0\xa0' + card_stats[6] : "");
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
			
			grid.appendChild(text);

			return grid;
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

			return HTML;
		}

		function isDigit(c) {
			return c >= '0' && c <= '9';
		}

		function hasAllChars(strOut, strIn) {
			let retVal = true;

			for (let i = 0; i < strIn.length; i++)
			{
				if (!strOut.includes(strIn.charAt(i)))
				{
					retVal = false;
				}
			}

			return retVal;
		}

		function hasNoChars(strOut, strIn) {
			let retVal = true;

			for (let i = 0; i < strIn.length; i++)
			{
				if (strOut.includes(strIn.charAt(i)))
				{
					retVal = false;
				}
			}

			return retVal;
		}

		function hasAllAndMoreChars(strOut, strIn) {
			let retVal = true;

			for (let i = 0; i < strIn.length; i++)
			{
				if (!strOut.includes(strIn.charAt(i)))
				{
					retVal = false;
				}
			}

			return retVal && (strOut.length > strIn.length);
		}

		document.getElementById("search").addEventListener("keypress", function(event) {
		  if (event.key === "Enter") {
			event.preventDefault();
			document.getElementById("searchBtn").click();
		  }
		});

		function previousPage() {
			page = page - 1;
			cardGrid.innerHTML = "";

			let url = (window.location.href.indexOf("page=") == -1 ? new URL(window.location.href) : new URL(window.location.href.substring(0, window.location.href.indexOf("page="))));
			let params = new URLSearchParams(url.search);
			if (page != 0)
			{
				params.append("page", page+1);
			}
			history.pushState({}, '', url.pathname + '?' + params.toString());

			for (let i = (pageCount * page); i < Math.min((pageCount * (page + 1)), search_results.length); i++)
			{
				cardGrid.appendChild(gridifyCard(search_results[i]));
			}

			document.getElementById("nextBtn").disabled = false;
			document.getElementById("nextBtn-footer").disabled = false;
			if (page == 0)
			{
				document.getElementById("prevBtn").disabled = true;
				document.getElementById("prevBtn-footer").disabled = true;
			}

			document.body.scrollTop = 0; // For Safari
  			document.documentElement.scrollTop = 0; // For real browsers
		}

		function nextPage() {
			page = page + 1;
			
			let url = (window.location.href.indexOf("page=") == -1 ? new URL(window.location.href) : new URL(window.location.href.substring(0, window.location.href.indexOf("page="))));
			let params = new URLSearchParams(url.search);
			params.append("page", page+1);
			history.pushState({}, '', url.pathname + '?' + params.toString());

			cardGrid.innerHTML = "";

			for (let i = (pageCount * page); i < Math.min((pageCount * (page + 1)), search_results.length); i++)
			{
				cardGrid.appendChild(gridifyCard(search_results[i]));
			}

			document.getElementById("prevBtn").disabled = false;
			document.getElementById("prevBtn-footer").disabled = false;
			if (search_results.length <= (pageCount * (page + 1)))
			{
				document.getElementById("nextBtn").disabled = true;
				document.getElementById("nextBtn-footer").disabled = true;
			}

			document.body.scrollTop = 0; // For Safari
  			document.documentElement.scrollTop = 0; // For real browsers
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
output_html_file = container_dir + "/search.html" # Relative to this script
generate_html(img_dir, output_html_file)