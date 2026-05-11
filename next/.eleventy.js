const yaml = require("js-yaml");

module.exports = function (eleventyConfig) {
  eleventyConfig.addDataExtension("yml,yaml", (contents) => yaml.load(contents));

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.svg": "favicon.svg" });
  eleventyConfig.addPassthroughCopy({ "src/.nojekyll": ".nojekyll" });

  eleventyConfig.addFilter("year", () => new Date().getFullYear());

  eleventyConfig.addFilter("cityName", (id, lang, cities) => {
    if (!cities) return id;
    const c = cities.find((x) => x.id === id);
    return c ? c.name[lang] || id : id;
  });

  eleventyConfig.addFilter("findPair", (pairs, slug) => {
    if (!pairs) return null;
    return pairs.find((p) => p.slug === slug) || null;
  });

  eleventyConfig.addFilter("formatDuration", (mins, lang) => {
    if (!mins) return "";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (lang === "ru") return `${h ? h + " ч " : ""}${m ? m + " мин" : ""}`.trim();
    if (lang === "pt") return `${h ? h + "h " : ""}${m ? m + "min" : ""}`.trim();
    return `${h ? h + "h " : ""}${m ? m + "min" : ""}`.trim();
  });

  eleventyConfig.addGlobalData("eleventyComputed", {
    permalink: (data) => {
      if (data.permalink !== undefined) return data.permalink;
      return data.page?.filePathStem
        ? `${data.page.filePathStem.replace(/\/index$/, "/")}/index.html`.replace(/\/+/g, "/")
        : undefined;
    },
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html", "11ty.js"],
  };
};
