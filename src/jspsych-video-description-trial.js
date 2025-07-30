import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

const info = {
    name: "video-description-trial",
    parameters: {
        video: {
            type: ParameterType.VIDEO,
            pretty_name: "Video",
            default: undefined,
        },
        // --- NEW PARAMETER FOR TOGGLING CONTROLS ---
        show_video_controls: {
            type: ParameterType.BOOL,
            pretty_name: "Show video controls",
            default: false, // Default to false for strict control in experiments
            description: "If true, native video controls (like play/pause bar, fullscreen, context menu) will be visible.",
        },
        instruction_text: {
            type: ParameterType.HTML_STRING,
            pretty_name: "Instruction text",
            default: "<b>Enter one word at a time, using as many words as would be helpful...</b>",
        },
        pause_notice_text: {
            type: ParameterType.HTML_STRING,
            pretty_name: "Pause notice text",
            default: "Click anywhere on the video to pause and make an entry.",
        },
        too_early_notice_text: {
            type: ParameterType.HTML_STRING,
            pretty_name: "Too early notice text",
            default: "Please wait slightly longer before pausing again.",
        },
        cannot_unpause_notice_text: {
            type: ParameterType.HTML_STRING,
            pretty_name: "Cannot unpause notice text",
            default: "You cannot unpause until you submit your list of words.",
        },
        cannot_add_notice_text: {
            type: ParameterType.HTML_STRING,
            pretty_name: "Cannot add notice text",
            default: "You cannot add a word already in the list.",
        },
        video_error_text: {
            type: ParameterType.HTML_STRING,
            pretty_name: "Video error text",
            default: "<p>Error: Could not load video. Please inform the experimenter.</p>",
        }
    },
};

class VideoDescriptionPlugin {
    constructor(jsPsych) {
        this.jsPsych = jsPsych;
    }

    async trial(display_element, trial) {
        return new Promise((resolve) => {
            // Conditionally add controls and oncontextmenu attributes based on parameter
            const controls_attr = trial.show_video_controls ? 'controls' : '';
            const contextmenu_attr = trial.show_video_controls ? '' : 'oncontextmenu="return false;"';

            // --- 1. RENDER THE HTML (Modified for conditional attributes) ---
            display_element.innerHTML = `
                <div class="video-trial-container">
                    <div class="video-trial-header">
                        <p><b>${trial.instruction_text}</b></p>
                    </div>
                    <div class="video-wrapper">
                        <video id="main-video" ${controls_attr} ${contextmenu_attr}></video>
                    </div>
                    <div class="video-trial-response-area">
                        <div id="desc-sorter" class="word-list"></div>
                        <div class="video-trial-notices">
                            <h5 id="pause-notice" class="notice-text--info">${trial.pause_notice_text}</h5>
                            <h5 id="too-early-notice" class="notice-text--error" style="display: none;">${trial.too_early_notice_text}</h5>
                            <h5 id="cannot-unpause-notice" class="notice-text--error" style="display: none;">${trial.cannot_unpause_notice_text}</h5>
                            <h5 id="cannot-add-notice" class="notice-text--error" style="display: none;">${trial.cannot_add_notice_text}</h5>
                        </div>
                        <form id="add-descript-form" class="word-entry-form">
                            <input id="descript-input" type="text" class="text-input" placeholder="e.g. 'happy', 'trustworthy'" autocomplete="off" disabled>
                            <button id="descript-add" type="submit" class="jspsych-btn word-entry-form__add-btn" disabled>+</button>
                        </form>
                        <button id="descript-submit" class="jspsych-btn" disabled>Submit Word List</button>
                    </div>
                </div>`;

            // --- 2. GET ELEMENTS AND SET UP VIDEO ---
            const video_player = display_element.querySelector('#main-video');
            video_player.src = `${trial.video}`;

            // Ensure controls are removed if not explicitly requested, even if added by browser defaults
            if (!trial.show_video_controls) {
                video_player.removeAttribute('controls');
            }

            const descript_input = display_element.querySelector('#descript-input');
            const descript_add_form = display_element.querySelector('#add-descript-form');
            const descript_submit_btn = display_element.querySelector('#descript-submit');
            const desc_sorter = display_element.querySelector('#desc-sorter');
            const cannot_add_notice = display_element.querySelector('#cannot-add-notice');
            const too_early_notice = display_element.querySelector('#too-early-notice');
            const cannot_unpause_notice = display_element.querySelector('#cannot-unpause-notice');
            const pause_notice = display_element.querySelector('#pause-notice');
            const video_error_notice = display_element.querySelector('#video-error-notice');

            let descriptors_data = [];
            let current_terms = [];
            let last_pause_time = -2;

            // Set initial state for input and buttons (they should be available if video starts paused)
            descript_input.disabled = false;
            descript_add_form.querySelector('button').disabled = false;

            // --- 3. EVENT LISTENERS ---

            video_player.onerror = () => {
                video_player.style.display = 'none';
                video_error_notice.style.display = 'block';
                descript_input.disabled = true;
                descript_add_form.querySelector('button').disabled = true;
                descript_submit_btn.disabled = true;
                setTimeout(() => {
                    resolve({ video: trial.video, descriptors: [] });
                }, 3000);
            };

            video_player.onended = () => {
                const trial_data = {
                    video: trial.video,
                    descriptors: descriptors_data
                };
                resolve(trial_data);
            };

            video_player.onplay = function () {
                descript_input.disabled = true;
                descript_add_form.querySelector('button').disabled = true;
                descript_submit_btn.disabled = true;
                pause_notice.style.display = 'block';
                cannot_unpause_notice.style.display = 'none';
                too_early_notice.style.display = 'none';
            };

            video_player.onpause = function () {
                if (video_player.ended) return;
                if (video_player.currentTime - last_pause_time <= 2) {
                    too_early_notice.style.display = 'block';
                    setTimeout(() => {
                        video_player.play();
                        too_early_notice.style.display = 'none';
                    }, 1500);
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
                list_item.innerText = new_word;
                const delete_btn = document.createElement('button');
                delete_btn.innerText = 'X';
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

            // Video click logic: Only allow pausing if show_video_controls is false
            if (!trial.show_video_controls) {
                video_player.onclick = () => {
                    if (!video_player.paused) {
                        video_player.pause();
                    } else {
                        cannot_unpause_notice.style.display = 'block';
                    }
                };
            }
            // If show_video_controls is true, the native controls and default click behavior will apply.

        });
    }
}
VideoDescriptionPlugin.info = info;

export default VideoDescriptionPlugin;