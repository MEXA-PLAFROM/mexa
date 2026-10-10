/* =========================================
   MEXA HOME JS
   Fungsi halaman utama
========================================= */

(function () {
  "use strict";


  function $(id) {
    return document.getElementById(id);
  }



  function initCreateButton() {

    const button = $("mx-create");
    const composer = $("mexa-composer");
    const textarea = $("mexaPostContent");


    if (!button || !composer) return;


    button.addEventListener("click", function () {


      composer.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });


      if (textarea) {

        setTimeout(function () {

          textarea.focus();

        }, 300);

      }


    });


  }






  function initMediaButtons() {


    const buttons =
      document.querySelectorAll(
        ".mx-create-buttons button"
      );


    if (!buttons.length) return;



    buttons.forEach(function(button){


      button.addEventListener(
        "click",
        function(){


          const text =
            button.textContent.trim();



          if (text.includes("Foto")) {


            alert(
              "MEXA: fitur foto siap dihubungkan."
            );


          }


          else if (text.includes("Video")) {


            alert(
              "MEXA: fitur video siap dihubungkan."
            );


          }


          else if (text.includes("Perasaan")) {


            alert(
              "MEXA: fitur perasaan siap dihubungkan."
            );


          }


        }
      );


    });


  }








  function initRefreshStory(){


    const buttons =
      document.querySelectorAll(
        ".mx-title button"
      );


    buttons.forEach(function(button){


      if (
        button.textContent.includes("Segarkan")
      ){


        button.addEventListener(
          "click",
          function(){


            const list =
              $("mexa-story-list");


            if(list){


              list.innerHTML =
              "Memuat cerita MEXA...";


              setTimeout(function(){


                list.innerHTML =
                "Belum ada cerita terbaru.";


              },800);


            }


          }
        );


      }


    });


  }








  function initPostButton(){


    const button =
      $("mexaPostButton");


    const textarea =
      $("mexaPostContent");



    if(!button || !textarea) return;



    button.addEventListener(
      "click",
      function(){


        const content =
          textarea.value.trim();



        if(!content){


          alert(
            "Tulis sesuatu sebelum posting."
          );


          return;


        }



     console.log(
  "Kirim posting MEXA:",
  content
);


if (typeof mexaAPI === "function") {

  mexaAPI("create_post", {
    content: content
  })
  .then(function(result){

    console.log(
      "Hasil posting:",
      result
    );


    textarea.value = "";


    alert(
      "Posting berhasil dikirim ke MEXA."
    );


    if (
      typeof loadMEXAFeed === "function"
    ) {

      loadMEXAFeed();

    }


  })
  .catch(function(error){

    console.error(
      "Posting gagal:",
      error
    );


    alert(
      "Posting gagal dikirim."
    );

  });


} else {

  alert(
    "API MEXA belum aktif."
  );

    }








  function init(){


    initCreateButton();

    initMediaButtons();

    initRefreshStory();

    initPostButton();


  }







  if(
    document.readyState === "loading"
  ){

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once:true
      }
    );


  }else{


    init();


  }


})();
