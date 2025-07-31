// src/index.js
import { initJsPsych } from 'jspsych';
import HtmlKeyboardResponsePlugin from '@jspsych/plugin-html-keyboard-response';
import InstructionsPlugin from '@jspsych/plugin-instructions';
import SurveyHtmlFormPlugin from '@jspsych/plugin-survey-html-form';
import SurveyTextPlugin from '@jspsych/plugin-survey-text';
import HtmlButtonResponsePlugin from '@jspsych/plugin-html-button-response';
import PreloadPlugin from '@jspsych/plugin-preload';
import VideoDescriptionPlugin from './jspsych-video-description-trial.js';
import SurveyPlugin from '@jspsych/plugin-survey';
import "./styles/main.scss";
const videoContext = require.context('./assets/video', false, /\.(mp4|webm|ogg|mov|MP4)$/);
const instructContext = require.context('./assets/video/instruct', false, /\.(mp4|webm|ogg|mov|MP4)$/);
const audioContext = require.context('./assets/video', false, /\.(m4a)$/)

function importAll(r) {
    let images = {};
    r.keys().map((item) => {
        images[item.replace('./', '')] = r(item);
    });
    return images;
}

function saveData(id, data) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', './php/write_data.php'); // 'write_data.php' is the path to the php file described above.
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ id: id, filedata: data }));
    console.log("Data saved to data/" + id);
}

const videos_all = Object.values(importAll(videoContext));
const instruct = importAll(instructContext)
const audio = importAll(audioContext);

let test_mode = false;

let subj_id;
const session_id = Date.now().toString(36) + Math.random().toString(36).substring(2);

// Initialize jsPsych
const jsPsych = initJsPsych({
    on_finish: function () {
        saveData(subj_id + "-" + session_id, jsPsych.data.get().csv());
        window.location.href = "https://app.prolific.com/submissions/complete?cc=C1HROM6I";
    }
});



// Create a randomized list of 10 videos for the experiment
const video_list = jsPsych.randomization.sampleWithReplacement(videos_all, 10);

// Create timeline variables for the loop
const video_timeline_variables = video_list.map(video_name => ({ video: video_name }));



// Main timeline
const timeline = [];

timeline.push({
    type: PreloadPlugin,
    video: [...video_list, ...Object.values(instruct)],
    audio: Object.values(audio),
    message: "Please wait while we load the study.",
});

const screener = {
    type: SurveyHtmlFormPlugin,
    html: `
        <div class="screener-container">
            <div class="screener-header">
                <h1>Welcome to the experiment</h1>
                <p>Please answer the following questions to determine your eligibility.</p>
            </div>
            
            <div class="screener-question">
                <label for="prolific-id-input" class="screener-question__title">Please enter your Prolific ID accurately.</label>
                <input type="text" name="prolific" id="prolific-id-input" required />
            </div>

            <div class="screener-question">
                <legend class="screener-question__title">Are you fluent in English?</legend>
                <div class="screener-question__options">
                    <div class="screener-question__option">
                        <input type="radio" name="Eng" id="eng-yes" value="Yes" required />
                        <label for="eng-yes">Yes</label>
                    </div>
                    <div class="screener-question__option">
                        <input type="radio" name="Eng" id="eng-no" value="No" />
                        <label for="eng-no">No</label>
                    </div>
                </div>
            </div>

            <div class="screener-question">
                <legend class="screener-question__title">Please read the following instructions carefully:</legend>
                <p class="screener-question__instructions">Recent research on decision making has shown that choices are affected by political party affiliation. To help us understand how people from different backgrounds make decisions, we are interested in information about you. Specifically, we want to know if you actually read any of the instructions we give at the beginning of our survey; if not, some results may not tell us very much about decision making and perception in the real world. To show that you have read the instructions, please ignore the questions about political party affiliation below and simply select "Other" at the bottom.</p>
                <p class="screener-question__title">For which political party do you typically vote?</p>
                <div class="screener-question__options">
                    <div class="screener-question__option">
                        <input type="radio" name="attention_check" id="pol-dem" value="Democratic" required />
                        <label for="pol-dem">Democratic</label>
                    </div>
                    <div class="screener-question__option">
                        <input type="radio" name="attention_check" id="pol-rep" value="Republican" />
                        <label for="pol-rep">Republican</label>
                    </div>
                    <div class="screener-question__option">
                        <input type="radio" name="attention_check" id="pol-ind" value="Independent" />
                        <label for="pol-ind">Independent</label>
                    </div>
                    <div class="screener-question__option">
                        <input type="radio" name="attention_check" id="pol-lib" value="Libertarian" />
                        <label for="pol-lib">Libertarian</label>
                    </div>
                    <div class="screener-question__option">
                        <input type="radio" name="attention_check" id="pol-grn" value="Green Party" />
                        <label for="pol-grn">Green Party</label>
                    </div>
                    <div class="screener-question__option">
                        <input type="radio" name="attention_check" id="pol-oth" value="Other" />
                        <label for="pol-oth">Other</label>
                    </div>
                </div>
            </div>
        </div>
    `,
    button_label: 'Continue',
    on_finish: function (data) {
        subj_id = data.response.prolific;
        jsPsych.data.addProperties({ subject_id: subj_id });

        if (subj_id.toLowerCase() === "test") {
            console.log("Test mode activated!");
            jsPsych.data.addProperties({ test_mode: true });
            video_trial.show_video_controls = true;
        }
    }
};


// This new trial will be shown to participants who fail the screener
const screener_failed_trial = {
    type: HtmlKeyboardResponsePlugin,
    stimulus: `
        <div style="max-width: 800px; margin: auto; text-align: center;">
            <p>Thank you for your interest in our study.</p>
            <p>Unfortunately, based on your responses, you are not eligible to continue.</p>
            <p>You may now close this window.</p>
        </div>
    `,
    choices: "NO_KEYS" // The trial will not end until the experiment is ended
};

// This is a conditional timeline that decides whether to end the experiment
const screener_check_procedure = {
    timeline: [screener_failed_trial],
    conditional_function: function () {
        // Get the data from the most recent trial (the screener)
        const data = jsPsych.data.get().last(1).values()[0];

        // Check if either condition for rejection is met
        if (data.response.Eng === "No" || data.response.attention_check !== "Other") {
            // If they failed, we want to run the timeline above (screener_failed_trial)
            // and then end the experiment.
            jsPsych.abortExperiment("You did not meet the eligibility requirements.");
            return true;
        } else {
            // If they passed, we do NOT want to run the timeline above.
            return false;
        }
    }
};

timeline.push(screener, screener_check_procedure);

// ## 2. Instructions ##

const instructions = {
    type: InstructionsPlugin,
    pages: [
        // Page 1: Landing Page
        `<div class="instructions-container">
            <div class="instructions-header">
                <h1>Instructions</h1>
                <p class="instructions-header__sub-title">Please read the following carefully</p>
            </div>
            <h2>Welcome to the experiment!</h2>
            <p class="instructions-text">Thank you for participating in our experiment!</p>
            <p class="instructions-text">We are researchers interested in how we understand other people in professional settings.</p>
            <p class="instructions-text">Your job today is simple. <b>There are four parts to our task.</b></p>
            <ul class="instructions-list">
                <li><strong>1. View professional video introductions and write down impressions of the speaker.</strong></li>
                <li><strong>2. Form a final impression of the speaker in the video.</strong></li>
                <li><strong>3. Rate the job candidate on several attributes. </strong></li>
                <li><strong>4. Decide whether to offer the job candidate an interview at the company.</strong></li>
            </ul>
            <p class="instructions-text">You will repeat these steps for each video.</p>
            <div class="instructions-highlight-box">
                <p>Today, you will take on the role of a professional recruiter. A set of companies (i.e., your clients) have tasked you with reviewing professional video introductions by job candidates. While viewing each video, you should form impressions about the person. Once you have watched the video and formed your impressions, you will make a decision about whether or not the candidate should be offered an interview at the company they applied to.</p>
            </div>
            <p class="instructions-text">In the next few pages, you will learn more about each step of the experiment.</p>
        </div>`,

        // Page 2: Step 1 Instructions
        `<div class="instructions-container">
            <div class="instructions-header">
                <h2>Step 1: Watch and describe the job candidate in the video.</h2>
            </div>
            <video class="instructions-video" autoplay muted loop src="${instruct["submitting.mov"]}" type="video/mp4"></video>
            <p class="instructions-text">Pause the video whenever you <strong>notice a new characteristic</strong> about the person or think of a <strong>new way to describe them.</strong> Pause by clicking anywhere on the video.</p>
            <p class="instructions-text"><strong>Enter one word at a time,</strong> but you can enter multiple words each time you pause (see video). For example, if you feel like the person is being an annoying student, pause and enter “annoying” and “student” separately. Order does not matter.</p>
            <p class="instructions-text">Enter whatever comes to mind spontaneously. There are no limits on what you enter! We only ask that you<strong> pause and describe the person multiple times.</strong></p>
            <div class="instructions-highlight-box">
                <p>Based on past experience, <strong>we expect you will pause 2-5 times per video.</strong> Please note there is a minimum amount of time that needs to pass between each time you pause the video (2 seconds).</p>
            </div>
        </div>`,

        // Page 3: Step 2 Instructions
        `<div class="instructions-container">
            <div class="instructions-header">
                <h2>Step 2: Form a final impression.</h2>
            </div>
            <video class="instructions-video" autoplay muted loop src="${instruct["final.mov"]}" type="video/mp4"></video>
            <p class="instructions-text">Form your final impression of the speaker. <strong>Think of this as a list of words you'd use to describe this person to someone else, your summary impression of a person.</strong> Once again, enter one word at a time, for as many words as you'd like.</p>
        </div>`,

        // Page 4: Step 3 Instructions (Part 1)
        `<div class="instructions-container">
            <div class="instructions-header">
                <h2>Step 3: Rate the speaker on several attributes.</h2>
            </div>
            <video class="instructions-video" autoplay muted loop src="${instruct["rating.mov"]}" type="video/mp4"></video>
            <p class="instructions-text">Once you finish watching the video, you will rate the candidate in the video on several attributes using a slider. <strong>Please go with your gut feelings, and don't overthink it.</strong> You will be evaluating the candidate on these attributes:</p>
            <p class="instructions-text"><b>Please read the category descriptions carefully below:</b></p>
            <ul class="instructions-list">
                <li><strong>Openness to new experiences:</strong> willingness to try new things and to explore new ideas</li>
                <li><strong>Conscientiousness:</strong> extent to which the candidate seems organized, hardworking, and goal-oriented</li>
                <li><strong>Extroversion:</strong> extent to which the candidate seems energized by social interaction and enjoys being around other people</li>
                <li><strong>Agreeableness:</strong> extent to which the candidate seems cooperative, kind, and trusting</li>
                <li><strong>Neuroticism:</strong> extent to which the candidate seems prone to negative emotions such as anxiety, anger, and sadness</li>
            </ul>
        </div>`,

        // Page 5: Step 3 Instructions (Part 2)
        `<div class="instructions-container">
             <div class="instructions-header">
                <h2>Step 3: Rate the speaker on several attributes (continued).</h2>
            </div>
            <p class="instructions-text"><b>Please read the category descriptions carefully below:</b></p>
            <ul class="instructions-list">
                <li><strong>Warmth:</strong> extent to which the candidate seems friendly, approachable, and likeable</li>
                <li><strong>Competence:</strong> extent to which the candidate seems capable, skilled, and knowledgeable</li>
                <li><strong>Confidence:</strong> extent to which the candidate displays self-assurance, decisiveness, and belief in their own abilities</li>
                <li><strong>Leadership capacity:</strong> extent to which the candidate seems like someone who can guide, inspire, and manage others effectively</li>
                <li><strong>Ambitiousness:</strong> extent to which the candidate displays a strong desire for achievement, advancement, and success</li>
                <li><strong>Trustworthiness:</strong> extent to which the candidate is seems reliable, honest, and dependable in their actions and communications</li>
            </ul>
        </div>`,

        // Page 6: Step 4 and Final Instructions
        `<div class="instructions-container">
            <div class="instructions-header">
                <h2>Step 4: Make a recruitment decision.</h2>
            </div>
            <video class="instructions-video" autoplay muted loop src="${instruct["decision.mov"]}" type="video/mp4"></video>
            <p class="instructions-text">After evaluating the candidate on all attributes, decide whether to invite them for an interview at the company they applied to.</p>
            <p class="instructions-text">You will repeat these 4 steps for 10 videos. We encourage you to have fun with this task. Writing more is better than writing less!</p>
            <p class="instructions-text">After completing all videos, there will be a textbox to provide feedback. We welcome any of your thoughts about ways to improve the task and appreciate your time and effort.</p>
            <p class="instructions-text">Press the button below to get started when you are ready.</p>
            <div class="instructions-final-prompt">
                <h3>Please make sure your sound is on before continuing.</h3>
            </div>
        </div>`
    ],
    show_clickable_nav: true,
    button_label_next: "Next",
    button_label_previous: "Previous"
};

timeline.push(instructions);

const audio_check_trial = {
    type: SurveyHtmlFormPlugin,
    html: `
        <div class="page-container">
            <div class="page-header">
                <h1>Audio Check</h1>
                <p class="page-header__sub-title">Please make sure your sound is on.</p>
            </div>
            <p class="page-text">In the audio clip below, you will hear a sequence of five numbers.</p>
            <p class="page-text">Please type those numbers in the box to continue.</p>
            
            <audio controls autoplay src="${audio["audiocheck.m4a"]}"></audio>
            
            <div class="form-item">
                <label for="audio-response">Enter the numbers you heard (e.g., "54392"):</label>
                <input type="text" id="audio-response" name="audio_response" class="text-input" required />
            </div>
        </div>
    `,
    button_label: 'Continue',
    data: {
        task: 'audio_check'
    }
};

const audio_check_feedback = {
    type: HtmlKeyboardResponsePlugin,
    stimulus: `<p>Incorrect. Please listen carefully and try again.</p>`,
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

timeline.push(audio_check_procedure);

// ## 4. Main Video Loop  ##
const video_trial = {
    type: VideoDescriptionPlugin,
    video: jsPsych.timelineVariable('video'),
    show_video_controls: false,
};




const final_impression_trial = {
    type: HtmlKeyboardResponsePlugin,
    stimulus: `
        <div class="page-container">
            <div class="page-header">
                <h1>Final Impressions</h1>
                <p class="page-header__sub-title">Please read the following carefully</p>
            </div>
            <p class="page-text">
                <b>Please add or remove any final words that you feel describe this candidate. <br><i>You must include at least two.</i></b>
            </p>
            <div class="final-impression-wrapper">
                <div id="final-sorter" class="word-list"></div>
                <p id="final-cannot-add-notice" class="notice-text--error" style="display: none;">You cannot add an item already in the list.</p>
                <form id="final-descript-form" class="word-entry-form">
                    <input id="final-descript-input" type="text" class="text-input" placeholder="e.g. 'thoughtful'" autocomplete="off">
                    <button id="final-descript-add" type="submit" class="jspsych-btn word-entry-form__add-btn">+</button>
                </form>
                <button id="final-submit" class="jspsych-btn" disabled>Submit Final Impression</button>
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
                list_item.className = 'list-group-item';
                list_item.innerText = word;
                const delete_btn = document.createElement('button');
                delete_btn.className = 'btn-close';
                delete_btn.innerText = "X";
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
};


const rating_trial = {
    type: SurveyHtmlFormPlugin,
    html: `
        <div class="rating-section-container">
            <div class="rating-header">
                <h1>Rating Impressions</h1>
                <p class="lead">Please read the following carefully</p>
                <p class="prompt">Rate the candidate in the video on the following parameters.</p>
            </div>
            <div class="rating-form-wrapper">
                <div class="rating-item">
                    <label for="openness" class="rating-label">Open to new experiences</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="openness" name="openness" min="0" max="10" step="1" value="5">
                </div>
                <div class="rating-item">
                    <label for="conscientiousness" class="rating-label">Conscientious</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="conscientiousness" name="conscientiousness" min="0" max="10" step="1" value="5">
                </div>
                <div class="rating-item">
                    <label for="extroversion" class="rating-label">Extroverted</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="extroversion" name="extroversion" min="0" max="10" step="1" value="5">
                </div>
                <div class="rating-item">
                    <label for="agreeableness" class="rating-label">Agreeable</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="agreeableness" name="agreeableness" min="0" max="10" step="1" value="5">
                </div>
                <div class="rating-item">
                    <label for="neuroticism" class="rating-label">Neurotic</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="neuroticism" name="neuroticism" min="0" max="10" step="1" value="5">
                </div>
                <div class="rating-item">
                    <label for="warmth" class="rating-label">Warm</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="warmth" name="warmth" min="0" max="10" step="1" value="5">
                </div>
                <div class="rating-item">
                    <label for="competence" class="rating-label">Competent</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="competence" name="competence" min="0" max="10" step="1" value="5">
                </div>
                <div class="rating-item">
                    <label for="confidence" class="rating-label">Confident</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="confidence" name="confidence" min="0" max="10" step="1" value="5">
                </div>
                <div class="rating-item">
                    <label for="leadership" class="rating-label">Capable of leadership</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="leadership" name="leadership" min="0" max="10" step="1" value="5">
                </div>
                <div class="rating-item">
                    <label for="ambitiousness" class="rating-label">Ambitious</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="ambitiousness" name="ambitiousness" min="0" max="10" step="1" value="5">
                </div>
                <div class="rating-item">
                    <label for="trustworthiness" class="rating-label">Trustworthy</label>
                    <div class="rating-slider-wrapper"><small>Least</small><small>Most</small></div>
                    <input type="range" class="rating-slider" id="trustworthiness" name="trustworthiness" min="0" max="10" step="1" value="5">
                </div>
            </div>
        </div>
    `,
    button_label: 'Submit Ratings'
};


const decision_trial = {
    type: HtmlButtonResponsePlugin, // This will now work because of the new import
    // ... stimulus and choices properties remain the same ...
    stimulus: `
        <div class="page-container">
            <div class="page-header">
                <h1>Recruitment Decision</h1>
                <p class="page-text"><b>Please decide whether to invite this candidate for an interview.</b></p>
            </div>
        </div>
    `,
    choices: ['Invite for interview', 'Do not invite for interview'],
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
    randomize_order: false, // The list is already shuffled
    on_finish: function () {
        saveData(subj_id + "-" + session_id, jsPsych.data.get().csv());
    }
};

// Push the full loop onto the main timeline
timeline.push(video_procedure);



// ## 5. Feedback and End ##

const feedback_trial = {
    type: SurveyTextPlugin,
    questions: [
        {
            prompt: `<div class="page-container">
                        <label for="feedback-textarea">Please let us know if any part of the study was confusing, unclear, or in need of improvement. We appreciate your feedback greatly!</label>
                     </div>`,
            name: 'feedback',
            rows: 5,
            columns: 60
        }
    ],
    button_label: 'Submit',
    on_finish: function (data) {
        if (test_mode) {
            jsPsych.pauseExperiment()
            jsPsych.data.displayData('csv');
        }
    }
};
// timeline.push(feedback);

const demographics_trial = {
    type: SurveyHtmlFormPlugin,
    html: `
        <div class="page-container">
            <div class="page-header">
                <h1>Demographics Section</h1>
            </div>
            <div class="demographics-form">
                <div class="form-item">
                    <label for="age-input">What is your age?</label>
                    <input type="number" name="age" id="age-input" class="text-input" required />
                </div>

                <fieldset class="form-fieldset">
                    <legend>What gender do you identify with? (Select all that apply)</legend>
                    <div class="form-option-group">
                        <div class="form-option"><input type="checkbox" name="gender" value="male" /><label>Male</label></div>
                        <div class="form-option"><input type="checkbox" name="gender" value="female" /><label>Female</label></div>
                        <div class="form-option"><input type="checkbox" name="gender" value="transgender" /><label>Transgender</label></div>
                        <div class="form-option"><input type="checkbox" name="gender" value="nonbinary" /><label>Non-binary</label></div>
                        <div class="form-option"><input type="checkbox" name="gender" value="other" /><label>Not otherwise specified</label></div>
                        <div class="form-option"><input type="checkbox" name="gender" value="decline" /><label>I do not wish to provide this information</label></div>
                    </div>
                </fieldset>

                <fieldset class="form-fieldset">
                    <legend>What race/ethnicity do you identify with? (Select all that apply)</legend>
                    <div class="form-option-group">
                        <div class="form-option"><input type="checkbox" name="race" value="AmericanIndian" /><label>American Indian or Alaska Native</label></div>
                        <div class="form-option"><input type="checkbox" name="race" value="Asian" /><label>Asian</label></div>
                        <div class="form-option"><input type="checkbox" name="race" value="Black" /><label>Black or African-American</label></div>
                        <div class="form-option"><input type="checkbox" name="race" value="PacificIslander" /><label>Native Hawaiian or Other Pacific Islander</label></div>
                        <div class="form-option"><input type="checkbox" name="race" value="White" /><label>White</label></div>
                        <div class="form-option"><input type="checkbox" name="race" value="Latino" /><label>Latino</label></div>
                        <div class="form-option"><input type="checkbox" name="race" value="Other" /><label>Other</label></div>
                    </div>
                </fieldset>
                
                <fieldset class="form-fieldset">
                    <legend>What is the highest level of education you have received?</legend>
                     <div class="form-option-group">
                        <div class="form-option"><input type="radio" name="education" value="LessThanHighSchool" required /><label>Less than High School</label></div>
                        <div class="form-option"><input type="radio" name="education" value="HighSchool" /><label>High School Diploma</label></div>
                        <div class="form-option"><input type="radio" name="education" value="SomeCollege" /><label>Some College</label></div>
                        <div class="form-option"><input type="radio" name="education" value="Associate" /><label>Associate's Degree</label></div>
                        <div class="form-option"><input type="radio" name="education" value="Bachelor" /><label>Bachelor's Degree</label></div>
                        <div class="form-option"><input type="radio" name="education" value="SomeGraduate" /><label>Some Graduate School</label></div>
                        <div class="form-option"><input type="radio" name="education" value="master" /><label>Master's Degree</label></div>
                        <div class="form-option"><input type="radio" name="education" value="doctoral" /><label>Doctoral Degree</label></div>
                    </div>
                </fieldset>
            </div>
        </div>
    `,
    button_label: 'Submit',
};


const finished_trial = {
    type: HtmlButtonResponsePlugin,
    stimulus: `
        <div class = "page_container">
            <div>
                <h1>Study Completed</h1>
            </div>
            <div>
                <h1>Thank you for participating in the study!</h1>
            </div>
        </div>
    `,
    choices: ['Click here to return to Prolific and complete the study'],
};


// Push the final sections
timeline.push(demographics_trial, feedback_trial, finished_trial);

// ## Run Experiment ##
jsPsych.run(timeline);