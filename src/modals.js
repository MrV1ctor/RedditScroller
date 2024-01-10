"use strict";
/// <reference path="main.js" />

let activateModal = document.querySelector("#filters")
let closeModal = document.querySelector("#filtersmodalclose")
let modal = document.querySelector("dialog#filtersmodal")

activateModal.addEventListener("click", ()=>{
    modal.showModal();
    console.log("clicked activate")
});

closeModal.addEventListener("click", ()=>{
    modal.close();
    console.log("clicked close")
});