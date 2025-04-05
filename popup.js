document.addEventListener("DOMContentLoaded", function () {
  const noteInput = document.getElementById("noteInput");
  const saveButton = document.getElementById("saveButton");
  const notesContainer = document.getElementById("notesContainer");
  const colorPicker = document.getElementById("colorPicker");
  const viewButtons = document.querySelectorAll(".view-button");

  let selectedColor = "default";
  let currentView = "list";
  let editingNoteId = null;

  // Check if chrome.storage is available
  const isChromeStorageAvailable =
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  // Initialize the app
  init();

  function init() {
    // Load saved notes when popup opens
    loadNotes();

    // Set up color picker
    setupColorPicker();

    // Set up view buttons
    setupViewButtons();

    // Save note when button is clicked
    saveButton.addEventListener("click", saveNote);

    // Allow saving with Enter key (but allow Shift+Enter for new lines)
    noteInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        saveNote();
      }
    });
  }

  function setupColorPicker() {
    const colorOptions = colorPicker.querySelectorAll(".color-option");
    colorOptions.forEach((option) => {
      option.addEventListener("click", function () {
        // Remove selected class from all options
        colorOptions.forEach((opt) => opt.classList.remove("selected"));
        // Add selected class to clicked option
        this.classList.add("selected");
        // Update selected color
        selectedColor = this.getAttribute("data-color");
      });
    });
  }

  function setupViewButtons() {
    viewButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // Remove active class from all buttons
        viewButtons.forEach((btn) => btn.classList.remove("active"));
        // Add active class to clicked button
        this.classList.add("active");
        // Update current view
        currentView = this.getAttribute("data-view");
        // Reload notes to apply the new view
        loadNotes();
      });
    });
  }

  function saveNote() {
    const noteText = noteInput.value.trim();

    if (noteText === "") {
      return; // Don't save empty notes
    }

    try {
      if (isChromeStorageAvailable) {
        chrome.storage.local.get(["notes"], function (result) {
          const notes = result.notes || [];

          if (editingNoteId) {
            // Update existing note
            const noteIndex = notes.findIndex(
              (note) => note.id === editingNoteId
            );
            if (noteIndex !== -1) {
              notes[noteIndex].text = noteText;
              notes[noteIndex].color = selectedColor;
              notes[noteIndex].date = new Date().toLocaleString();
            }
          } else {
            // Create new note
            const newNote = {
              id: Date.now(),
              text: noteText,
              color: selectedColor,
              date: new Date().toLocaleString(),
              pinned: false,
            };
            notes.unshift(newNote);
          }

          // Save notes
          chrome.storage.local.set({ notes: notes }, function () {
            if (chrome.runtime.lastError) {
              console.error("Error saving note:", chrome.runtime.lastError);
            } else {
              resetForm();
              loadNotes();
            }
          });
        });
      } else {
        // Fallback to localStorage
        let notes = JSON.parse(localStorage.getItem("quickNotes") || "[]");

        if (editingNoteId) {
          // Update existing note
          const noteIndex = notes.findIndex(
            (note) => note.id === editingNoteId
          );
          if (noteIndex !== -1) {
            notes[noteIndex].text = noteText;
            notes[noteIndex].color = selectedColor;
            notes[noteIndex].date = new Date().toLocaleString();
          }
        } else {
          // Create new note
          const newNote = {
            id: Date.now(),
            text: noteText,
            color: selectedColor,
            date: new Date().toLocaleString(),
            pinned: false,
          };
          notes.unshift(newNote);
        }

        localStorage.setItem("quickNotes", JSON.stringify(notes));
        resetForm();
        loadNotes();
      }
    } catch (error) {
      console.error("Error saving note:", error);
    }
  }

  function resetForm() {
    noteInput.value = "";
    editingNoteId = null;
    saveButton.textContent = "Save Note";
    // Reset to default color
    document.querySelector('.color-option[data-color="default"]').click();
  }

  function loadNotes() {
    try {
      if (isChromeStorageAvailable) {
        chrome.storage.local.get(["notes"], function (result) {
          if (chrome.runtime.lastError) {
            console.error("Error loading notes:", chrome.runtime.lastError);
            showErrorMessage();
            return;
          }
          displayNotes(result.notes || []);
        });
      } else {
        const notes = JSON.parse(localStorage.getItem("quickNotes") || "[]");
        displayNotes(notes);
      }
    } catch (error) {
      console.error("Error loading notes:", error);
      showErrorMessage();
    }
  }

  function displayNotes(notes) {
    notesContainer.innerHTML = "";

    if (notes.length === 0) {
      notesContainer.innerHTML =
        '<div class="empty-message">No notes yet. Start by adding one above!</div>';
      return;
    }

    // Separate pinned and unpinned notes
    const pinnedNotes = notes.filter((note) => note.pinned);
    const unpinnedNotes = notes.filter((note) => !note.pinned);

    // Apply current view mode
    if (currentView === "grid") {
      notesContainer.classList.add("grid-view");
      notesContainer.classList.remove("list-view");
    } else {
      notesContainer.classList.add("list-view");
      notesContainer.classList.remove("grid-view");
    }

    // Display pinned notes first
    if (pinnedNotes.length > 0) {
      const pinnedSection = document.createElement("div");
      pinnedSection.innerHTML = `<div style="font-size: 14px; color: #86868b; margin-bottom: 8px;">Pinned Notes</div>`;
      notesContainer.appendChild(pinnedSection);

      pinnedNotes.forEach((note) => {
        notesContainer.appendChild(createNoteElement(note));
      });

      const unpinnedSection = document.createElement("div");
      unpinnedSection.innerHTML = `<div style="font-size: 14px; color: #86868b; margin: 16px 0 8px;">Other Notes</div>`;
      notesContainer.appendChild(unpinnedSection);
    }

    // Display unpinned notes
    unpinnedNotes.forEach((note) => {
      notesContainer.appendChild(createNoteElement(note));
    });
  }

  function createNoteElement(note) {
    const noteElement = document.createElement("div");
    noteElement.className = `note-item note-${note.color || "default"}`;

    const pinClass = note.pinned ? "pin-button pinned" : "pin-button";

    noteElement.innerHTML = `
      <div class="note-actions">
        <button class="${pinClass}" data-id="${note.id}" title="Pin note">📍</button>
        <button class="edit-button" data-id="${note.id}" title="Edit note">✏️</button>
        <button class="delete-button" data-id="${note.id}" title="Delete note">×</button>
      </div>
      <div class="note-text">${note.text}</div>
      <div class="note-date">${note.date}</div>
    `;

    // Add event listeners to action buttons
    noteElement
      .querySelector(".delete-button")
      .addEventListener("click", () => deleteNote(note.id));
    noteElement
      .querySelector(".edit-button")
      .addEventListener("click", () => editNote(note.id));
    noteElement
      .querySelector(".pin-button")
      .addEventListener("click", () => togglePinNote(note.id));

    return noteElement;
  }

  function deleteNote(noteId) {
    try {
      if (isChromeStorageAvailable) {
        chrome.storage.local.get(["notes"], function (result) {
          const notes = result.notes || [];
          const updatedNotes = notes.filter((note) => note.id !== noteId);

          chrome.storage.local.set({ notes: updatedNotes }, function () {
            if (chrome.runtime.lastError) {
              console.error("Error deleting note:", chrome.runtime.lastError);
            } else {
              loadNotes();
            }
          });
        });
      } else {
        let notes = JSON.parse(localStorage.getItem("quickNotes") || "[]");
        const updatedNotes = notes.filter((note) => note.id !== noteId);
        localStorage.setItem("quickNotes", JSON.stringify(updatedNotes));
        loadNotes();
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  }

  function editNote(noteId) {
    try {
      if (isChromeStorageAvailable) {
        chrome.storage.local.get(["notes"], function (result) {
          const notes = result.notes || [];
          const noteToEdit = notes.find((note) => note.id === noteId);

          if (noteToEdit) {
            noteInput.value = noteToEdit.text;
            editingNoteId = noteId;
            saveButton.textContent = "Update Note";

            // Select the note's color
            const colorOption = document.querySelector(
              `.color-option[data-color="${noteToEdit.color || "default"}"]`
            );
            if (colorOption) {
              document
                .querySelectorAll(".color-option")
                .forEach((opt) => opt.classList.remove("selected"));
              colorOption.classList.add("selected");
              selectedColor = noteToEdit.color || "default";
            }

            // Focus the textarea
            noteInput.focus();
          }
        });
      } else {
        const notes = JSON.parse(localStorage.getItem("quickNotes") || "[]");
        const noteToEdit = notes.find((note) => note.id === noteId);

        if (noteToEdit) {
          noteInput.value = noteToEdit.text;
          editingNoteId = noteId;
          saveButton.textContent = "Update Note";

          // Select the note's color
          const colorOption = document.querySelector(
            `.color-option[data-color="${noteToEdit.color || "default"}"]`
          );
          if (colorOption) {
            document
              .querySelectorAll(".color-option")
              .forEach((opt) => opt.classList.remove("selected"));
            colorOption.classList.add("selected");
            selectedColor = noteToEdit.color || "default";
          }

          // Focus the textarea
          noteInput.focus();
        }
      }
    } catch (error) {
      console.error("Error editing note:", error);
    }
  }

  function togglePinNote(noteId) {
    try {
      if (isChromeStorageAvailable) {
        chrome.storage.local.get(["notes"], function (result) {
          const notes = result.notes || [];
          const noteIndex = notes.findIndex((note) => note.id === noteId);

          if (noteIndex !== -1) {
            notes[noteIndex].pinned = !notes[noteIndex].pinned;

            chrome.storage.local.set({ notes: notes }, function () {
              if (chrome.runtime.lastError) {
                console.error("Error pinning note:", chrome.runtime.lastError);
              } else {
                loadNotes();
              }
            });
          }
        });
      } else {
        let notes = JSON.parse(localStorage.getItem("quickNotes") || "[]");
        const noteIndex = notes.findIndex((note) => note.id === noteId);

        if (noteIndex !== -1) {
          notes[noteIndex].pinned = !notes[noteIndex].pinned;
          localStorage.setItem("quickNotes", JSON.stringify(notes));
          loadNotes();
        }
      }
    } catch (error) {
      console.error("Error pinning note:", error);
    }
  }

  function showErrorMessage() {
    notesContainer.innerHTML =
      '<div class="empty-message">Error loading notes. Please check console for details.</div>';
  }
});
