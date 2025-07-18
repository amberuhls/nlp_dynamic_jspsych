import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

const info = {
    name: "video-description-trial",
    parameters: {
        video: {
            type: ParameterType.VIDEO,
            pretty_name: "Video",
            default: undefined,
        },
    },
};

class VideoDescriptionPlugin {
    constructor(jsPsych) {
        this.jsPsych = jsPsych;
    }

    async trial(display_element, trial) {
        // We wrap the entire trial logic in a Promise.
        // The trial will not end until we call the `resolve` function.
        return new Promise((resolve) => {
            // --- 1. RENDER THE HTML (Same as before) ---
            display_element.innerHTML = `
                <div class="card">
                    <div class="row pt-4 card-header">
                        <p class="display-8 text-center">
                            <b>Enter one word at a time, using as many words as would be helpful...</b>
                        </p>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6 d-flex justify-content-center mx-auto my-1">
                                <video id="main-video" width="640" height="480" oncontextmenu="return false;"></video>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div id="desc-sorter" class="list-group col-6 mx-auto"></div>
                        </div>
                        <div class="row text-center text-danger mt-2">
                            <h5 id="pause-notice" style="display: block;">Click anywhere on the video to pause and make an entry.</h5>
                            <h5 id="too-early-notice" style="display: none;">Please wait slightly longer before pausing again.</h5>
                            <h5 id="cannot-unpause-notice" style="display: none;">You cannot unpause until you submit your list of words.</h5>
                            <h5 id="cannot-add-notice" style="display: none;">You cannot add a word already in the list.</h5>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6 mx-auto text-center">
                                <form id="add-descript-form" class="form-inline justify-content-center">
                                    <div class="input-group mb-3">
                                        <input id="descript-input" type="text" class="form-control" placeholder="e.g. 'happy', 'trustworthy'" autocomplete="off" disabled>
                                        <button id="descript-add" type="submit" class="btn btn-primary" disabled>+</button>
                                    </div>
                                </form>
                                <button id="descript-submit" class="btn btn-primary my-1" disabled>Submit Word List</button>
                            </div>
                        </div>
                    </div>
                </div>`;

            // --- 2. GET ELEMENTS AND SET UP VIDEO (Same as before) ---
            const video_player = display_element.querySelector('#main-video');
            video_player.src = `assets/video/${trial.video}`;

            // --- All other element getters are the same ---
            const descript_input = display_element.querySelector('#descript-input');
            const descript_add_form = display_element.querySelector('#add-descript-form');
            const descript_submit_btn = display_element.querySelector('#descript-submit');
            //... etc.

            let descriptors_data = [];
            let current_terms = [];
            let last_pause_time = -2;

            // --- 3. EVENT LISTENERS (with one critical change) ---

            // When the video ends, gather data and RESOLVE THE PROMISE to finish the trial
            video_player.onended = () => {
                const trial_data = {
                    video: trial.video,
                    descriptors: descriptors_data
                };
                // THIS IS THE FIX: Instead of calling finishTrial, we resolve the promise.
                resolve(trial_data);
            };

            // ALL OTHER EVENT LISTENERS (onplay, onpause, onsubmit, onclick)
            // remain exactly the same as in the previous step. They just
            // manipulate the state and the DOM as before.
            const desc_sorter = display_element.querySelector('#desc-sorter');
            const cannot_add_notice = display_element.querySelector('#cannot-add-notice');
            const too_early_notice = display_element.querySelector('#too-early-notice');
            const cannot_unpause_notice = display_element.querySelector('#cannot-unpause-notice');
            const pause_notice = display_element.querySelector('#pause-notice');


            video_player.onplay = function () {
                descript_input.disabled = true;
                descript_add_form.querySelector('button').disabled = true;
                descript_submit_btn.disabled = true;
                pause_notice.style.display = 'block';
                cannot_unpause_notice.style.display = 'none';
            };

            video_player.onpause = function () {
                if (video_player.ended) return;
                if (video_player.currentTime - last_pause_time <= 2) {
                    video_player.play();
                    too_early_notice.style.display = 'block';
                } else {
                    descript_input.disabled = false;
                    descript_add_form.querySelector('button').disabled = false;
                    pause_notice.style.display = 'none';
                    too_early_notice.style.display = 'none';
                    cannot_unpause_notice.style.display = 'block';
                }
            };

            descript_add_form.onsubmit = (e) => {
                e.preventDefault();
                const new_word = descript_input.value.trim();
                if (new_word === '') return;
                if (current_terms.includes(new_word)) {
                    cannot_add_notice.style.display = 'block';
                    return;
                }
                cannot_add_notice.style.display = 'none';
                current_terms.push(new_word);
                const list_item = document.createElement('div');
                list_item.className = 'list-group-item d-flex justify-content-between align-items-center';
                list_item.innerText = new_word;
                const delete_btn = document.createElement('button');
                delete_btn.className = 'btn-close';
                delete_btn.onclick = function () {
                    current_terms = current_terms.filter(word => word !== new_word);
                    list_item.remove();
                    if (current_terms.length === 0) {
                        descript_submit_btn.disabled = true;
                    }
                };
                list_item.appendChild(delete_btn);
                desc_sorter.appendChild(list_item);
                descript_input.value = '';
                descript_submit_btn.disabled = false;
            };

            descript_submit_btn.onclick = () => {
                const current_timestamp = video_player.currentTime;
                last_pause_time = current_timestamp;
                const new_data = current_terms.map(word => ({ word: word, timestamp: current_timestamp }));
                descriptors_data = descriptors_data.concat(new_data);
                current_terms = [];
                desc_sorter.innerHTML = '';
                cannot_add_notice.style.display = 'none';
                video_player.play();
            };

            video_player.onclick = () => {
                if (video_player.paused) {
                    if (current_terms.length > 0) {
                        cannot_unpause_notice.style.display = 'block';
                    } else {
                        video_player.play();
                    }
                } else {
                    video_player.pause();
                }
            };
        });
    }
}
VideoDescriptionPlugin.info = info;

export default VideoDescriptionPlugin;