// ---------- Autocomplete Suggestions ----------
const suggestionsDiv = document.getElementById("suggestions");

els.movieInput.addEventListener("input", async (e) => {
  const query = e.target.value.trim();
  if (query.length < 2) {
    suggestionsDiv.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
    );
    const data = await res.json();

    suggestionsDiv.innerHTML = "";
    data.results.slice(0, 5).forEach(movie => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      const year = movie.release_date ? ` (${movie.release_date.slice(0,4)})` : "";
      div.textContent = movie.title + year;
      div.addEventListener("click", () => {
        els.movieInput.value = movie.title;
        suggestionsDiv.innerHTML = "";
      });
      suggestionsDiv.appendChild(div);
    });
  } catch (err) {
    console.error("Autocomplete failed:", err);
  }
});

// Hide suggestions on blur
els.movieInput.addEventListener("blur", () => {
  setTimeout(() => { suggestionsDiv.innerHTML = ""; }, 200);
});
