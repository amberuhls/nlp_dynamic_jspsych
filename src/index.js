// src/index.js
import { initJsPsych } from 'jspsych';
import HtmlKeyboardResponsePlugin from '@jspsych/plugin-html-keyboard-response';
import InstructionsPlugin from '@jspsych/plugin-instructions';
import SurveyHtmlFormPlugin from '@jspsych/plugin-survey-html-form';
import SurveyTextPlugin from '@jspsych/plugin-survey-text';
import HtmlButtonResponsePlugin from '@jspsych/plugin-html-button-response';
import VideoDescriptionPlugin from './jspsych-video-description-trial.js';
import "./styles/main.scss";
const videoContext = require.context('./assets/video', false, /\.(mp4|webm|ogg|mov|MP4)$/);
const audioContext = require.context('./assets/video', false, /\.(m4a)$/)

const videoPaths = videoContext.keys();
const audioPaths = audioContext.keys();

// 3. Import each video
const videos_all = videoPaths.map(videoPath => {
    // Use the 'split' method to break the path by the '/' character,
    // then 'pop()' to get the last element (which should be the filename).
    return videoPath.split('/').pop();
});
const audio = audioPaths.map(audioContext)

// Now 'videos' is an array where each element is the URL of a video asset
console.log(videos_all, audio); // e.g., ['/media/video1.abcdef123.mp4', '/media/video2.ghijkl456.webm']


const STUDY_ID = "study_3";

// Initialize jsPsych
const jsPsych = initJsPsych({
    on_finish: function () {
        // Final data saving and redirect
        jsPsych.data.displayData();
    }
});

// [Add this near the top of your src/js/main.js file]


// Create a randomized list of 10 videos for the experiment
const video_list = jsPsych.randomization.sampleWithReplacement(videos_all, 10);

// Create timeline variables for the loop
const video_timeline_variables = video_list.map(video_name => ({ video: video_name }));



// Main timeline
const timeline = [];

// ## 1. Screener ##
const screener = {
    type: SurveyHtmlFormPlugin,
    html: `
        <div class="container-fluid">
            <div class="header px-3 py-3 pt-md-5 pb-md-4 mx-auto text-center row">
                <h1 class="display-4">Welcome to the experiment</h1>
                <p class="lead">Please answer the following questions to determine your eligility.</p>
            </div>
            <div class="col d-flex justify-content-center mx-auto">
                <div>
                    <div class="form-group">
                        <label class="control-label" for="prolific-id">Please enter your Prolific ID correctly.</label>
                        <input id="prolific-id" name="prolific_id" type="text" class="form-control" autocomplete="off" required />
                    </div>
                    <div class="form-group">
                        <label for="english-check-input">Are you fluent in English?</label>
                        <select class="form-control" name="fluent_english" id="english-check-input" required>
                            <option>No</option>
                            <option>Yes</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>`, // The HTML content remains the same as before
    button_label: 'Submit',
    on_finish: function (data) {
        // This logic remains the same
        const subj_id = data.response.prolific_id;
        jsPsych.data.addProperties({ subject_id: subj_id });
    }
};

const rejection_screen = {
    type: HtmlKeyboardResponsePlugin,
    stimulus: `
        <div class="row">
            <div class="col d-flex justify-content-center mx-auto">
                <h1>Thank you for your interest. Unfortunately, you are not eligible for this task. We appreciate it if you do not complete this experiment.</h1>
            </div>
        </div>`, // The HTML content remains the same
    choices: "NO_KEYS"
};

const if_fluent_english = {
    timeline: [rejection_screen],
    conditional_function: function () {
        // This logic remains the same
        const data = jsPsych.data.get().last(1).values()[0];
        if (data.response.fluent_english == 'No') {
            return true;
        } else {
            return false;
        }
    }
};

timeline.push(screener, if_fluent_english);

// ## 2. Instructions ##
const instructions = {
    type: InstructionsPlugin,
    pages: [
        // Page 1 (from #instructions-landing)
        `<h1>Welcome to the experiment!</h1>
         <p>Thank you for participating in our experiment!</p>
         <p>We are researchers interested in in how we understand other people in professional settings.</p>
         <p>Your job today is simple. <b>There are four parts to our task.</b></p>
         <ul class="list-group">
            <li class="list-group-item"><strong>1. View professional video introductions and write down impressions of the speaker.</strong></li>
            <li class="list-group-item"><strong>2. Form a final impression of the speaker in the video.</strong></li>
            <li class="list-group-item"><strong>3. Rate the job candidate on several attributes. </strong></li>
            <li class="list-group-item"><strong>4. Decide whether to offer the job candidate an interview at the company.</strong></li>
          </ul>
         <p class="alert alert-dark">Today, you will take on the role of a professional recruiter...</p>`,
        // Page 2 (from #instructions1)
        `<h1>Step 1: Watch and describe the job candidate in the video.</h1>
         <p>Pause the video whenever you want to enter words describing the person in the video. You can pause by clicking anywhere on the video.</p>
         <p><strong>Enter one word at a time, </strong> but you can enter multiple words each time you pause...</p>`,
        // ... more instruction pages would go here ...
        // Page last (from #instructions5)
        `<h1>Step 4: Make a recruitment decision.</h1>
         <p>After evaluating the candidate on all attributes, decide whether to invite them for an interview at the company they applied to.</p>
         <p>Press the button below to get started when you are ready.</p>
         <div class="alert alert-dark text-center"><h3>Please make sure your sound is on before continuing.</h3></div>`
    ],
    show_clickable_nav: true
};

timeline.push(instructions);



// --- Replace the entire audio_check_procedure with this corrected version ---

const audio_check_trial = {
    type: SurveyHtmlFormPlugin,
    html: `
        <div class="col-6 justify-content-center mx-auto text-center">
            <div class="header px-3 py-3 pt-md-5 pb-md-4 mx-auto text-center">
                <h1 class="display-4">Audio Check</h1>
                <p class="lead" style="color: red">Please make sure your sound is on.</p>
            </div>
            <p>In the audio clip below, you will hear a sequence of five numbers.</p>
            <p>Please type those numbers in the box to continue.</p>
            <audio controls autoplay src="assets/video/audiocheck.m4a"></audio>
            <div class="mt-4">
                <label for="audio-response">Enter the numbers you heard (e.g., "54392"):</label>
                <input type="text" id="audio-response" name="audio_response" class="form-control text-center" required />
            </div>
        </div>
    `,
    button_label: 'Continue',
    // Add a data property to easily identify this trial's data
    data: {
        task: 'audio_check'
    }
};

const audio_check_feedback = {
    type: HtmlKeyboardResponsePlugin,
    stimulus: `<p class="text-danger">Incorrect. Please listen carefully and try again.</p>`,
    choices: "NO_KEYS",
    trial_duration: 2000,
};

// This is a conditional trial that only runs if the last answer was wrong
const if_audio_check_failed = {
    timeline: [audio_check_feedback],
    conditional_function: function () {
        // Get the data from the last trial
        const last_trial_data = jsPsych.data.get().last(1).values()[0];
        // Check if it was the audio check and if the response was incorrect
        if (last_trial_data.task === 'audio_check' && last_trial_data.response.audio_response.trim() !== '42359') {
            return true; // Show the feedback
        } else {
            return false; // Skip the feedback
        }
    }
};

// The main procedure now has a simpler loop function
const audio_check_procedure = {
    // The timeline now includes the trial AND the conditional feedback
    timeline: [audio_check_trial, if_audio_check_failed],
    // The loop function now ONLY decides whether to loop
    loop_function: function () {
        // Get data from the audio check trial
        const last_audio_check_data = jsPsych.data.get().filter({ task: 'audio_check' }).last(1).values()[0];
        if (last_audio_check_data.response.audio_response.trim() !== '42359') {
            return true; // If wrong, continue the loop
        } else {
            return false; // If correct, end the loop
        }
    }
};
// In your main timeline array, replace the old audio_check_loop with this new procedure:
// timeline.push(screener, if_fluent_english, instructions, audio_check_procedure, video_procedure, ...);

timeline.push(audio_check_procedure);

// ## 4. Main Video Loop  ##
const video_trial = {
    type: VideoDescriptionPlugin,
    video: jsPsych.timelineVariable('video')
};



// --- Replace the existing final_impression_trial ---
const final_impression_trial = {
    type: HtmlKeyboardResponsePlugin,
    stimulus: `
        <div id="final-impression-body">
            <div class="header px-3 pt-md-1 mx-auto text-center">
                <h1 class="display-4">Final Impressions</h1>
                <p class="lead" style="color: red">Please read the following carefully</p>
            </div>
            <div class="row">
                <div class="col-6 justify-content-center mx-auto text-center">
                    <p class="display-8">
                        <b>Please add or remove any final words that you feel describe this candidate. <br><i>You must include at least two.</i></b>
                    </p>
                </div>
            </div>
            <div class="row">
                <div class="col-6 mx-auto">
                    <div id="final-sorter" class="list-group"></div>
                    <p id="final-cannot-add-notice" class="text-danger text-center" style="display: none;">You cannot add an item already in the list.</p>
                    <form id="final-descript-form" class="form-inline justify-content-center mt-2">
                        <div class="input-group">
                            <input id="final-descript-input" type="text" class="form-control" placeholder="e.g. 'thoughtful'" autocomplete="off">
                            <button id="final-descript-add" type="submit" class="btn btn-primary">+</button>
                        </div>
                    </form>
                    <button id="final-submit" class="btn btn-primary my-2 w-100" disabled>Submit Final Impression</button>
                </div>
            </div>
        </div>
    `,
    choices: "NO_KEYS",
    on_load: function () {
        const sorter = document.getElementById('final-sorter');
        const add_form = document.getElementById('final-descript-form');
        const input = document.getElementById('final-descript-input');
        const submit_btn = document.getElementById('final-submit');
        const notice = document.getElementById('final-cannot-add-notice');
        let final_terms = [];

        function render_list() {
            sorter.innerHTML = '';
            final_terms.forEach(word => {
                const list_item = document.createElement('div');
                list_item.className = 'list-group-item d-flex justify-content-between align-items-center';
                list_item.innerText = word;
                const delete_btn = document.createElement('button');
                delete_btn.className = 'btn-close';
                delete_btn.onclick = function () {
                    final_terms = final_terms.filter(t => t !== word);
                    render_list();
                };
                list_item.appendChild(delete_btn);
                sorter.appendChild(list_item);
            });
            submit_btn.disabled = final_terms.length < 2;
        }

        add_form.onsubmit = function (e) {
            e.preventDefault();
            const new_word = input.value.trim();
            if (new_word === '') return;
            if (final_terms.includes(new_word)) {
                notice.style.display = 'block';
                return;
            }
            notice.style.display = 'none';
            final_terms.push(new_word);
            input.value = '';
            render_list();
        };

        submit_btn.onclick = function () {
            jsPsych.finishTrial({
                final_descriptors: final_terms,
            });
        };

        render_list();
    },
    on_finish: function (data) {
        // This is the line that was causing the error.
        // I have removed the incorrect ".response" property.
        const descriptors_to_save = data.final_descriptors;

        // Failsafe: if for some reason the descriptors are undefined, save an empty array
        if (typeof descriptors_to_save !== 'undefined') {
            const subj_id = jsPsych.data.get().filter({ trial_type: 'survey-html-form' }).values()[0].response.prolific_id;
            const video_name = jsPsych.evaluateTimelineVariable('video');
        }
    }
};

// --- Replace the existing rating_trial ---
const rating_trial = {
    type: SurveyHtmlFormPlugin,
    // ... html property remains the same ...
    html: `
        <div id="rating-body">
            <div class="header px-3 pt-md-1 mx-auto text-center">
                <h1 class="display-4">Rating Impressions</h1>
                <p class="display-8"><b>Rate the candidate in the video on the following parameters.</b></p>
            </div>
            <div class="col-6 justify-content-center mx-auto">
                <div class="mb-3">
                    <label for="openness" class="form-label">Open to new experiences</label>
                    <input type="range" class="form-range" name="openness" min="0" max="10" step="1" value="5">
                </div>
                <div class="mb-3">
                    <label for="conscientiousness" class="form-label">Conscientious</label>
                    <input type="range" class="form-range" name="conscientiousness" min="0" max="10" step="1" value="5">
                </div>
                <div class="mb-3">
                    <label for="trustworthiness" class="form-label">Trustworthy</label>
                    <input type="range" class="form-range" name="trustworthiness" min="0" max="10" step="1" value="5">
                </div>
            </div>
        </div>
    `,
    button_label: 'Submit Ratings',
    on_finish: function (data) {
        // CORRECTED API CALLS
        const subj_id = jsPsych.data.get().filter({ trial_type: 'survey-html-form' }).values()[0].response.prolific_id;
        const video_name = jsPsych.evaluateTimelineVariable('video');
    }
};

// --- Replace the existing decision_trial ---
const decision_trial = {
    type: HtmlButtonResponsePlugin, // This will now work because of the new import
    // ... stimulus and choices properties remain the same ...
    stimulus: `
        <div id="recruitment-decision-body">
            <div class="header px-3 pt-md-1 mx-auto text-center">
                <h1 class="display-4">Recruitment Decision</h1>
                <p class="display-8"><b>Please decide whether to invite this candidate for an interview.</b></p>
            </div>
        </div>
    `,
    choices: ['Invite for interview', 'Do not invite for interview'],
    on_finish: function (data) {
        const invited = data.response == 0; // 0 for the first choice

        // CORRECTED API CALLS
        const subj_id = jsPsych.data.get().filter({ trial_type: 'survey-html-form' }).values()[0].response.prolific_id;
        const video_name = jsPsych.evaluateTimelineVariable('video');
    }
};


// The full procedure for one video
const video_procedure = {
    timeline: [
        video_trial,
        final_impression_trial,
        rating_trial,
        decision_trial
    ],
    timeline_variables: video_timeline_variables,
    randomize_order: false // The list is already shuffled
};

// Push the full loop onto the main timeline
timeline.push(video_procedure);



// ## 5. Feedback and End ##

const feedback_trial = {
    type: SurveyTextPlugin,
    questions: [
        {
            prompt: `<div class="col d-flex justify-content-center mx-auto text-center px-3 pt-md-1">
                        <label for="feedback-textarea" class="mb-3">Please let us know if any part of the study was confusing, unclear, or in need of improvement. We appreciate your feedback greatly!</label>
                     </div>`,
            name: 'feedback',
            rows: 5,
            columns: 60
        }
    ],
    button_label: 'Submit',
    on_finish: function (data) {
        const subj_id = jsPsych.data.get().values()[0].subject_id;
    }
};
// timeline.push(feedback);

// Add this trial definition to your main.js file

const demographics_trial = {
    type: SurveyHtmlFormPlugin,
    html: `
        <div class="col-8 mx-auto">
            <div>
                <div class="header px-3 py-3 pt-md-5 pb-md-4 mx-auto text-center">
                    <h1 class="display-4">Demographics Section</h1>
                </div>
                <div class="survey mx-auto col-6 text-left">
                    <div class="form-group mb-4">
                        <label for="age-input">What is your age?</label>
                        <input type="number" name="age" class="form-control" id="age-input" required />
                    </div>
                    <fieldset class="form-group mb-4">
                        <label>What gender do you identify with? (Select all that apply)</label>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="gender" id="gender-male" value="male" />
                            <label class="form-check-label" for="gender-male">Male</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="gender" id="gender-female" value="female" />
                            <label class="form-check-label" for="gender-female">Female</label>
                        </div>
                        </fieldset>
                    <fieldset class="form-group mb-4">
                        <label>What race/ethnicity do you identify with? (Select all that apply)</label>
                        <div class="form-check">
                             <input class="form-check-input" type="checkbox" name="race" value="AmericanIndian" id="race-AmericanIndian" />
                             <label class="form-check-label" for="race-AmericanIndian">American Indian or Alaska Native</label>
                        </div>
                        </fieldset>
                    <fieldset class="form-group mb-4">
                        <label>What is the highest level of education you have received?</label>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="education" value="LessThanHighSchool" id="education-LessThanHighSchool" required />
                            <label class="form-check-label" for="education-LessThanHighSchool">Less than High School</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="education" value="doctoral" id="education-doctoral" />
                            <label class="form-check-label" for="education-doctoral">Doctoral Degree</label>
                        </div>
                    </fieldset>
                </div>
            </div>
        </div>
    `,
    button_label: 'Submit',
    on_finish: function (data) {
        const subj_id = jsPsych.data.get().values()[0].subject_id;
    }
};
// Add this trial definition to your main.js file

const finished_trial = {
    type: HtmlButtonResponsePlugin,
    stimulus: `
        <div class="col-8 justify-content-center mx-auto">
            <div class="header px-3 py-3 pt-md-5 pb-md-4 mx-auto text-center">
                <h1 class="display-4">Study Completed</h1>
            </div>
            <div class="alert alert-dark text-center">
                <h1>Thank you for participating in the study!</h1>
            </div>
        </div>
    `,
    choices: ['Click here to return to Prolific and complete the study'],
    on_finish: function () {
        // Redirect to Prolific completion URL
        window.location.href = "https://app.prolific.com/submissions/complete?cc=C1HROM6I";
    }
};
// In your main.js, find the timeline definition and add the new trials

// Push the final sections
timeline.push(demographics_trial, feedback_trial, finished_trial);

// ## Run Experiment ##
jsPsych.run(timeline);