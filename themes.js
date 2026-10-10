/* =========================================
   MEXA THEMES JS
========================================= */


(function () {


const THEMES = [

  {
    id: "midnight",
    name: "Midnight Neon"
  },

  {
    id: "arctic",
    name: "Arctic Light"
  },

  {
    id: "emerald",
    name: "Emerald"
  },

  {
    id: "sunset",
    name: "Sunset"
  },

  {
    id: "cyberpunk",
    name: "Cyberpunk"
  }

];



const STORAGE_KEY = "mexa-theme";





function applyTheme(theme){


  document.body.dataset.theme = theme;


  localStorage.setItem(
    STORAGE_KEY,
    theme
  );


}







function getSavedTheme(){


  return localStorage.getItem(
    STORAGE_KEY
  ) || "midnight";


}








function createThemePanel(){


const container =
document.getElementById(
"mexa-theme-container"
);



if(!container) return;




const panel =
document.createElement("div");



panel.id =
"mexa-theme-panel";



panel.hidden = true;




const title =
document.createElement("h3");


title.textContent =
"Tema MEXA";



panel.appendChild(title);






THEMES.forEach(theme=>{


const button =
document.createElement("button");



button.type =
"button";



button.textContent =
theme.name;




button.onclick =
()=>{


applyTheme(theme.id);



panel.hidden = true;



};



panel.appendChild(button);



});






container.appendChild(panel);






const themeButton =
document.getElementById(
"mx-theme-button"
);




if(themeButton){


themeButton.onclick =
()=>{


panel.hidden =
!panel.hidden;



};



}




}









function initTheme(){


applyTheme(
getSavedTheme()
);


createThemePanel();


}







document.addEventListener(
"DOMContentLoaded",
initTheme
);



})();
