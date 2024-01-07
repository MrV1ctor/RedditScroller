let activateModal = document.querySelector("#filters")
let closeModal = document.querySelector("#filtersmodalclose")
let modal = document.querySelector("#filtersmodal")

activateModal.addEventListener("click", ()=>{
    modal.style.display = "block"
    console.log("clicked activate")
});

closeModal.addEventListener("click", ()=>{
    modal.style.display = "none"
    console.log("clicked close")
});