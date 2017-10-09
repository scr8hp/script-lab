import * as $ from 'jquery';
import { isNil } from 'lodash';
import { UI } from '@microsoft/office-js-helpers';
import { environment, instantiateRibbon, generateUrl, navigateToCompileCustomFunctions } from '../app/helpers';
import { Strings, setDisplayLanguage } from '../app/strings';
import { loadFirebug, officeNamespacesForIframe } from './runner.common';
import { Messenger, CustomFunctionsMessageType } from '../app/helpers/messenger';

interface InitializationParams {
    isRunMode: boolean;
    snippetIframesBase64Texts: Array<string>;
    heartbeatParams: ICustomFunctionsHeartbeatParams
    explicitlySetDisplayLanguageOrNull: string;
    returnUrl: string;
}

const CSS_CLASSES = {
    inProgress: 'in-progress',
    error: 'error',
    success: 'success'
};

(() => {
    let showUI: boolean;

    (() => {
        let params: InitializationParams = (window as any).customFunctionParams;

        try {
            environment.initializePartial({ host: 'EXCEL' });
            showUI = !params.isRunMode; /* show UI for registration, not when running in invisible pane */

            if (showUI) {
                // Apply the host theming by adding this attribute on the "body" element:
                $('body').addClass('EXCEL');
                $('#header').css('visibility', 'visible');

                if (instantiateRibbon('ribbon')) {
                    $('#progress').css('border-top', '#ddd 5px solid;');
                }
            }

            Office.initialize = async () => {
                // Need separate try/catch, since Office.initialize is a callback
                try {
                    // Set initialize to an empty function -- that way, doesn't cause
                    // re-initialization of this page in case of a page like the error dialog,
                    // which doesn't defined (override) Office.initialize.
                    Office.initialize = () => { };

                    await initializeRunnerHelper(params);
                } catch (e) {
                    handleError(e);
                }
            };

        }
        catch (error) {
            handleError(error);
        }
    })();

    async function initializeRunnerHelper(initialParams: InitializationParams) {
        if (initialParams.explicitlySetDisplayLanguageOrNull) {
            setDisplayLanguage(initialParams.explicitlySetDisplayLanguageOrNull);
            document.cookie = `displayLanguage=${encodeURIComponent(initialParams.explicitlySetDisplayLanguageOrNull)};path=/;`;
        }

        const $snippetNames = showUI ? $('#snippet-names') : null;

        if (showUI) {
            await loadFirebug(environment.current.config.editorUrl);
        }

        // Begin with clearing out the Excel.Script.CustomFunctions namespace
        // (which is assume to already exist and be initialized in the
        // "custom-functions" runtime helpers)
        (Excel as any).Script.CustomFunctions = {};

        let allSuccessful = true;

        const actualCount = initialParams.snippetIframesBase64Texts.length - 1;
        /* Last one is always null, set in the template for ease of trailing commas... */

        for (let i = 0; i < actualCount; i++) {
            const snippetBase64OrNull = initialParams.snippetIframesBase64Texts[i];
            let $entry = showUI ? $snippetNames.children().eq(i) : null;

            if (isNil(snippetBase64OrNull)) {
                if (showUI) {
                    $entry.addClass(CSS_CLASSES.error);
                }
            } else {
                if (showUI) {
                    $entry.addClass(CSS_CLASSES.inProgress);
                }

                let success = await runSnippetCode(atob(initialParams.snippetIframesBase64Texts[i]));
                allSuccessful = allSuccessful && success;
                if (showUI) {
                    $entry.removeClass(CSS_CLASSES.inProgress)
                        .addClass(success ? CSS_CLASSES.success : CSS_CLASSES.error);
                }
            }
        }

        // Complete any function registrations
        await Excel.run(async (context) => {
            (context.workbook as any).customFunctions.addAll();
            await context.sync();
        });

        if (showUI && !allSuccessful) {
            $('.ms-progress-component__footer').css('visibility', 'hidden');
        }

        if (initialParams.isRunMode) {
            // Note that only establish heartbeat at end,
            // once registration code has completed and was SUCCESSFUL
            // (heartbeat sets variables to show its last success time)
            establishHeartbeat(initialParams.heartbeatParams);
        }
        else {
            if (allSuccessful) {
                window.location.href = initialParams.returnUrl;
            }
        }
    }

    /** Runs the snippet code and returns true if successful, or false if any errors were encountered */
    function runSnippetCode(html: string): Promise<boolean> {
        const $iframe =
            $('<iframe class="snippet-frame" style="display:none" src="about:blank"></iframe>');
        $('body').append($iframe);

        const iframe = $iframe[0] as HTMLIFrameElement;
        let { contentWindow } = iframe;

        return new Promise((resolve, reject) => {
            (window as any).scriptRunnerBeginInit = () => {
                contentWindow['Office'] = window['Office'];
                officeNamespacesForIframe.forEach(namespace => {
                    contentWindow[namespace] = window[namespace];
                });
            };

            (window as any).scriptRunnerEndInit = () => {
                // Call Office.initialize(), which now initializes the snippet.
                // The parameter, initializationReason, is not used in the playground.
                Office.initialize(null /*initializationReason*/);
                resolve(true);
            };

            // Write to the iframe (and note that must do the ".write" call first,
            // before setting any window properties).
            contentWindow.document.open();
            contentWindow.document.write(html);
            contentWindow.onerror = (...args) => {
                console.error(args);
                resolve(false);
            };
            contentWindow.document.close();
        });
    }

    function establishHeartbeat(heartbeatParams: ICustomFunctionsHeartbeatParams) {
        const $iframe = $('<iframe>', {
            src: generateUrl(`${environment.current.config.editorUrl}/custom-functions-heartbeat.html`, heartbeatParams),
            id: 'heartbeat'
        }).css('display', 'none').appendTo('body');

        const heartbeat: {
            messenger: Messenger<CustomFunctionsMessageType>,
            window: Window
        } = <any>{};
        heartbeat.messenger = new Messenger(environment.current.config.editorUrl);
        heartbeat.window = ($iframe[0] as HTMLIFrameElement).contentWindow;

        heartbeat.messenger.listen<{ }>()
            .filter(({ type }) => type === CustomFunctionsMessageType.NEED_TO_REFRESH)
            .subscribe(input => {
                navigateToCompileCustomFunctions('run', input.message);
            });
    }

    function handleError(error: Error) {
        let candidateErrorString = error.message || error.toString();
        if (candidateErrorString === '[object Object]') {
            candidateErrorString = Strings().unexpectedError;
        }

        UI.notify(error);

        // FIXME: may want a back button of sorts, too...
    }

})();
