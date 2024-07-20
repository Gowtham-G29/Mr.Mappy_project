'use strict';


// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//set map as global variable

class workout {
    //date on the activity
    date = new Date();
    //creating unique id's
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        // this.date =...
        // this.id=...
        this.coords = coords;//[lat, lng]
        this.distance = distance;//in km
        this.duration = duration;// in min

    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
};

//child classes
class Running extends workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();

    }

    calcPace() {
        //min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.type;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        //Km/h
        this.speed = this.distance / this.duration;
        return this.speed;
    }
}

// const run1= new Running([39,-12],5.2,24,170);
// const cycle2=new Cycling([39,-12],27,95,523);

//Application architecture
class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        //Get users position
        this._getPosition();

        //Get datafrom localstorage
        this._getLocalStorage();



        //Attach handlers
        form.addEventListener('submit', this._newWorkout.bind(this));

        inputType.addEventListener('change', this._toggleEleveationField);

        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    }

    _getPosition() {
        if (navigator.geolocation) {
            //Bind method is very very important in this case of connections between methods and constructors
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('could not get your position');
            });
        }
    }

    //Load map
    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;

        //setting coords to the map in array format
        const coords = [latitude, longitude];


        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        L.marker(coords).addTo(this.#map)
            .bindPopup('Your are current here!')
            .openPopup();

        //handling clicks on a map
        //display a map marker when click the location
        this.#map.on('click', this._showForm.bind(this));

        //render workoutMarker on the map from local storage
        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        })
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        //render the form when click
        form.classList.remove('hidden');
        inputDistance.focus();

    }
    //Hide the form +clear inputs

    _hideForm() {
        //empty inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ' ';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid';
        }, 1000);
    }

    _toggleEleveationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {

        const validInputs = (...inputs) =>
            inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();



        //Get data from the form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;


        //If activity running ,create a running project
        if (type === 'running') {
            const cadence = +inputCadence.value;
            //Check if the data is valid
            // if (!Number.isFinite(distance) || !Number.isFinite(distance) || !Number.isFinite(cadence))
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                return alert('Inputs have to be positive!')
            }
            workout = new Running([lat, lng], distance, duration, cadence);


        }

        //If activity is Cycling ,create Cycling Object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration, elevation)) {
                return alert('Inputs have to be positive!')
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }
        //Add new object to work out array
        this.#workouts.push(workout);



        //render workout on a map as a marker
        this._renderWorkoutMarker(workout);
        //Render workout on a list
        this._renderWorkout(workout);

        //Hide form + clear input fields
        this._hideForm();

        //set localstorage to all workouts
        this._setLocalStorage();

    };

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,

            })
            )
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();

    };

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
                `;

        if (workout.type === 'running') {
            html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;
        };

        if (workout.type === 'cycling') {
            html += `
             <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> 
            `;
        };

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) {
            return;
        }
        const workout = this.#workouts.find(function (work) {
            if (work.id === workoutEl.dataset.id) {
                return work.id;
            }
        });

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            },
        })
    };

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    };


    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) {
            return;
        }
        this.#workouts = data;
           
     this.#workouts.forEach(work=>{
        this._renderWorkout(work);
     })

    };

    
    //call the reset method will reset the local storage by reload
    _reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }


};

const app = new App();









