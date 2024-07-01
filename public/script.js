

let currentSlide = 0;
const slides = document.querySelectorAll('.slide');

function showSlide(slideIndex) {
    slides.forEach((slide, index) => {
        if (index === slideIndex) {
            slide.style.display = 'block';
        } else {
            slide.style.display = 'none';
        }
    });
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
}

// Set initial slide
showSlide(currentSlide);

// Start automatic slide switching every 20 seconds
setInterval(nextSlide, 15000);

const accordionHeaders = document.querySelectorAll(".accordion-header");

accordionHeaders.forEach(header => {
    header.addEventListener("click", () => {
        const accordionItem = header.parentElement;
        const content = accordionItem.querySelector(".accordion-content");

        if (content.style.maxHeight) {
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
        }
    });
});

const slides2 = document.querySelectorAll('.slide2');
let currentSlide2 = 0;

function showSlide2(index) {
    slides2.forEach((slide2, i) => {
        slide2.classList.toggle('active', i === index);
    });
}

function nextSlide2() {
    currentSlide2 = (currentSlide2 + 1) % slides.length;
    showSlide2(currentSlide2);
}

showSlide2(currentSlide2);

document.addEventListener('click', nextSlide2);


/* Set the width of the sidebar to 250px (show it) */
function openNav() {
    document.getElementById("filters-container").style.width = "80vw";
}

/* Set the width of the sidebar to 0 (hide it) */
function closeNav() {
    document.getElementById("filters-container").style.width = "0";
}



