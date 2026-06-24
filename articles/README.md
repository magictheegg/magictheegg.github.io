To add articles, create folders within this directory with the following contents:

- article.md (the article contents)
- bg.png (the background for the article; defaults to white)
- card.png (the image for the article card on all-articles; defaults to the article's first image if not specified)

The article will be titled the name of the containing directory.

If you want articles to be grouped within the all-articles page, add a parent directory. For instance,

-> articles
  -> testing
    -> article1
      -> article.md
    -> article2
      -> article.md

Will show article1 and article2 under the "testing" subheader of the all-articles page.