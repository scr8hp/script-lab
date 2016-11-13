interface ISnippet {
    id?: string;
    gist?: string;
    author?: string;
    source?: string;
    name?: string;
    description?: string;
    script?: {
        content: string;
        language: string;
    };
    template?: {
        content: string;
        language: string;
    };
    style?: {
        content: string;
        language: string;
    };
    libraries: string;
}

interface IPlaylist {
    groups: {
        name: string,
        items: {
            name: string,
            description?: string,
            gist: string
        }[]
    }[]
}

interface IMonacoEditorState {
    name?: string,
    content?: string,
    viewState?: monaco.editor.IEditorViewState,
    model?: monaco.editor.IModel
}

interface IDialog {
    title: string;
    message?: string;
    primary: IDialogAction;
    secondary?: IDialogAction;
}

interface IDialogAction {
    text: string;
    action: () => any;
}