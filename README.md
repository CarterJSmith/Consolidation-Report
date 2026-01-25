# Overview

Through this project, I wanted to push myself as a software engineer by taking a real world problem and solving it with code. My goal was to move past simple examples and build something that reflects how software can improve efficiency in the real world. This project allowed me to practice structuring data, applying logic to meaningful datasets, and thinking about performance, scalability, and usability from a practical standpoint.

This application processes inventory data directly in the browser, organizes it into meaningful data structures, and applies consolidation logic. By doing this, it demonstrates how warehouse decisions can be made faster, more consistently, and with less manual effort.

This current implementation uses a lightweight, client-side technology stack. While it is not yet optimized for large-scale production use, it establishes a strong foundation for a more efficient and scalable solution. The data already exists to make better decisions; this project focuses on building the structure and logic that turns that data into something actionable.

The purpose of this software is to help warehouses become more efficient by reducing the time and effort required to identify consolidation opportunities. In this warehouse, consolidation is handled through a slow manual processes that is both error prone and inefficient. This project explores how JavaScript can be used to automate that process, improving speed, consistency, and overall operational flow. 

{Provide a link to your YouTube demonstration. It should be a 4-5 minute demo of the software running and a walkthrough of the code. Focus should be on sharing what you learned about the language syntax.}

[Consolidation Report Demo Video](https://youtu.be/APvWC6t4qao)

# Development Environment

This project was entirely completed using VScode and the built in browser console. 

This program uses
- JavaScript 
- Html
- CSS
- SheetsJS
- JSPdf

# Useful Websites


- [SheetJS](https://docs.sheetjs.com/docs/)
- [JSPdf](https://artskydj.github.io/jsPDF/docs/jsPDF.html)
- [W3 Schools Javascript](https://www.w3schools.com/js/default.asp)

# Future Work

- Improve organization of reportPdf
    - Further formating and organization needs to be done for report readbility.
- Implement Edit Report button
    - Allows user to edit settings before generating the report
- Suggest Consolidation 
    - Current implementaion identifies items that can be consolidated but does not say if the potential locations have space or if they are full.

# AI Use
The focus of this assignment was developing javascript. The initial html and css were generated using "gemini 3 flash thinking".

Promts included
- Show me a website with a simple upload a file to memory with javascript. List the HTML and CSS styling in separate files and leave the logic empty in the JavaScript file.
- Make the upload area look more professional and remove generate button.

The initial git push for this project shows the stub of html, css. Small sytle changes have been made to the titles and text to better align with this project.