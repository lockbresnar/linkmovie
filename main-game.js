// existing constants, state, functions...

// =======================================================
// AUTOCOMPLETE
// =======================================================
const suggestionsBox = document.getElementById("suggestions");

els.movieInput.addEventListener("input", async () => {
  const query = els.movieInput.value.trim();
  suggestionsBox.innerHTML = "";
  if (!query) return;

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
    );
    const data = await res.json();

    data.results.slice(0, 5).forEach(movie => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = movie.title;
      div.addEventListener("click", () => {
        els.movieInput.value = movie.title;
        suggestionsBox.innerHTML = "";
      });
      suggestionsBox.appendChild(div);
    });
  } catch (err) {
    console.error("Autocomplete failed:", err);
  }
});

// Clear suggestions when input loses focus
els.movieInput.addEventListener("blur", () => {
  setTimeout(() => {
    suggestionsBox.innerHTML = "";
  }, 200);
});
