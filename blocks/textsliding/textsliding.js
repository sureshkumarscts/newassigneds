const cust = document.getElementsByClassName("textsliding ul");

cust.classList.add("textsliding-track");


const listItems = cust.querySelectorAll("li");

// Add a class to each LI
listItems.forEach(li => {
  li.classList.add("textsliding-item");
});

