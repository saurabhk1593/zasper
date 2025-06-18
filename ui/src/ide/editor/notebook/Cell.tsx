/* eslint-disable no-control-regex */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import CodeMirror, { Prec } from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { vscodeLight, vscodeDark } from '@uiw/codemirror-theme-vscode';
import { keymap, ViewUpdate } from '@codemirror/view';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import CellButtons from './CellButtons';
import { languages } from '@codemirror/language-data';
import { useAtom } from 'jotai';
import { themeAtom } from '../../../store/Settings';
import { AnsiUp } from 'ansi_up';

type CellType = 'code' | 'markdown' | 'raw' | string;

export interface ICell {
  cell_type: CellType;
  id: string;
  execution_count: number;
  source: string;
  outputs: any;
  reload: boolean;
}

interface ICellProps {
  cell: ICell;
  index: number;
  submitCell: (source: string, cellId: string) => void;
  addCellUp: () => void;
  addCellDown: () => void;
  prevCell: () => void;
  nextCell: () => void;
  deleteCell: (index: number) => void;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  handleKeyDown: any;
  changeCellType: any;
  divRefs: React.RefObject<(HTMLDivElement | null)[]>;
  execution_count: number;
  codeMirrorRefs: any;
  updateCellSource: any;
  showPrompt: Boolean;
  promptContent: any;
  submitPrompt: any;
  toggleShowPrompt: () => void;
  inspectReplyMessage: any;
  submitTabCompletion: (source: string, cellId: string, cursor_pos: number) => void;
}

export interface CodeMirrorRef {
  editor: {
    focus: () => void;
  };
}

const Cell = React.forwardRef((props: ICellProps, ref) => {
  const { cell, updateCellSource } = props;
  const [theme] = useAtom(themeAtom);
  const [cellContents, setCellContents] = useState(cell.source);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [totalLines, setTotalLines] = useState(0);

  const onChange = useCallback(
    (value, viewUpdate) => {
      setCellContents(value);
      updateCellSource(value, cell.id);
    },
    [cell, updateCellSource]
  );

  const onUpdate = useCallback((viewUpdate: ViewUpdate) => {
    if (viewUpdate) {
      const { state } = viewUpdate;
      const cursor = state.selection.main.from;
      const line = state.doc.lineAt(cursor).number;

      const totalLines = state.doc.lines;
      setCursorPosition(line);
      setTotalLines(totalLines);
    }
    // props.setFocusedIndex(props.index)
  }, []);

  const handleKeyDownCM = (event) => {
    if (event.key === 'ArrowDown' && cursorPosition === totalLines) {
      props.handleKeyDown(false, { key: 'ArrowDown', preventDefault: () => {} });
      event.preventDefault();
    } else if (event.key === 'ArrowUp' && cursorPosition === 1) {
      props.handleKeyDown(false, { key: 'ArrowUp', preventDefault: () => {} });
      event.preventDefault();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      props.submitTabCompletion(cell.id, 'abs', cursorPosition);
      event.preventDefault();
    }
  };

  const handleCmdEnter = () => {
    if (props.cell.cell_type === 'code') {
      props.submitCell(cellContents, props.cell.id);
    }
    props.handleKeyDown(true, { key: 'ArrowDown', preventDefault: () => {} });
    return true;
  };

  const handleChangeCellType = () => {
    if (props.cell.cell_type === 'code') {
      props.changeCellType('markdown');
    }
    if (props.cell.cell_type === 'markdown') {
      props.changeCellType('raw');
    }
    if (props.cell.cell_type === 'raw') {
      props.changeCellType('code');
    }
    return true;
  };

  const customKeymap = keymap.of([
    {
      key: 'Shift-Enter',
      run: handleCmdEnter,
    },
    {
      key: 'Shift-M',
      run: handleChangeCellType,
    },
  ]);

  // Make sure divRefs.current is not null before assigning
  const divRef = (el: HTMLDivElement | null) => {
    if (props.divRefs.current) {
      props.divRefs.current[props.index] = el;
    }
  };

  if (cell.cell_type === 'markdown') {
    return (
      <div
        tabIndex={props.index}
        className={props.index === props.focusedIndex ? 'single-line activeCell' : 'single-line'}
        ref={divRef}
        onFocus={() => props.setFocusedIndex(props.index)}
      >
        {props.index === props.focusedIndex ? (
          <>
            <CellButtons
              index={props.index}
              cellId={cell.id}
              code={cellContents}
              addCellUp={props.addCellUp}
              addCellDown={props.addCellDown}
              submitCell={props.submitCell}
              deleteCell={props.deleteCell}
              nextCell={props.nextCell}
              prevCell={props.prevCell}
            />
            <div className="inner-content">
              <div className="cellEditor">
                <CodeMirror
                  theme={theme === 'light' ? vscodeLight : vscodeDark}
                  value={cellContents}
                  height="auto"
                  width="100%"
                  extensions={[
                    markdown({ base: markdownLanguage, codeLanguages: languages }),
                    [Prec.highest(customKeymap)],
                  ]}
                  autoFocus={props.index === props.focusedIndex ? true : false}
                  onChange={onChange}
                  onUpdate={onUpdate}
                  onKeyDown={handleKeyDownCM}
                  basicSetup={{
                    lineNumbers: false,
                    bracketMatching: true,
                    highlightActiveLineGutter: true,
                    autocompletion: true,
                    lintKeymap: true,
                    foldGutter: true,
                    completionKeymap: true,
                    tabSize: 4,
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <Markdown rehypePlugins={[rehypeRaw]}>{cellContents}</Markdown>
        )}
      </div>
    );
  }

  return (
    <div
      tabIndex={props.index}
      className={props.index === props.focusedIndex ? 'single-line activeCell' : 'single-line'}
      ref={divRef}
      onFocus={() => props.setFocusedIndex(props.index)}
    >
      {props.index === props.focusedIndex ? (
        <CellButtons
          index={props.index}
          code={cellContents}
          cellId={cell.id}
          submitCell={props.submitCell}
          addCellUp={props.addCellUp}
          addCellDown={props.addCellDown}
          deleteCell={props.deleteCell}
          nextCell={props.nextCell}
          prevCell={props.prevCell}
        />
      ) : (
        <></>
      )}

      <div className="inner-content">
        {props.execution_count === -1 ? (
          <LoaderSvg />
        ) : (
          <div className="serial-no">[{props.execution_count}]:</div>
        )}
        <div className="cellEditor">
          <CodeMirror
            theme={theme === 'light' ? vscodeLight : vscodeDark}
            value={cellContents}
            height="auto"
            width="100%"
            extensions={[python(), [Prec.highest(customKeymap)]]}
            autoFocus={props.index === props.focusedIndex ? true : false}
            onChange={onChange}
            onUpdate={onUpdate}
            onKeyDown={handleKeyDownCM}
            basicSetup={{
              lineNumbers: false,
              bracketMatching: true,
              highlightActiveLineGutter: true,
              autocompletion: true,
              lintKeymap: true,
              foldGutter: true,
              completionKeymap: true,
              tabSize: 4,
            }}
          />
        </div>
      </div>
      {props.showPrompt &&
        props.promptContent &&
        props.promptContent.content &&
        props.promptContent.parent_header.msg_id === props.cell.id && (
          <Prompt
            content={props.promptContent}
            submitPrompt={props.submitPrompt}
            toggleShowPrompt={props.toggleShowPrompt}
          />
        )}
      <div className="inner-text">
        <CellOutput data={cell} />
      </div>
    </div>
  );
});

const HTMLWithScripts = ({ html }: { html: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.text = oldScript.textContent || '';
      }
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      );
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [html]);

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />;
};

const CellOutput = ({ data }) => {
  const ansi_up = new AnsiUp();

  if (!data) {
    return null;
  }

  const { outputs } = data;
  if (outputs && outputs.length > 0) {
    const output = outputs[0];

    if (output.output_type === 'error') {
      const { ename, evalue, traceback } = output;

      // Join traceback array and convert to HTML with ANSI colors
      const tracebackHtml = ansi_up.ansi_to_html(traceback ? traceback.join('\n') : '');

      return (
        <div>
          <h6>
            {ename}: {evalue}
          </h6>
          <pre>
            <div dangerouslySetInnerHTML={{ __html: tracebackHtml }} />
          </pre>
        </div>
      );
    }

    const { text, 'text/plain': textPlain, data: outputData } = output;

    if (text) {
      const textHtml = ansi_up.ansi_to_html(text);
      return (
        <pre>
          <div dangerouslySetInnerHTML={{ __html: textHtml }} />
        </pre>
      );
    }

    if (textPlain) {
      const textPlainHtml = ansi_up.ansi_to_html(textPlain);
      return (
        <pre>
          <div dangerouslySetInnerHTML={{ __html: textPlainHtml }} />
        </pre>
      );
    }

    if (outputData) {
      const {
        'text/html': htmlContent,
        'image/png': imageContent,
        'text/plain': textPlainData,
      } = outputData;

      if (htmlContent) {
        return <HTMLWithScripts html={htmlContent} />;
      }

      if (imageContent) {
        const blob = `data:image/png;base64,${imageContent}`;
        return (
          <div>
            <img src={blob} alt="cell output" />
          </div>
        );
      }

      if (textPlainData) {
        const textPlainDataHtml = ansi_up.ansi_to_html(textPlainData);
        return (
          <pre>
            <div dangerouslySetInnerHTML={{ __html: textPlainDataHtml }} />
          </pre>
        );
      }
    }

    // Fallback if output type is unrecognized
    return <p>{JSON.stringify(output)}</p>;
  }

  return null;
};

const LoaderSvg = () => {
  return (
    <div className="svgContainer">
      <svg
        className="spinner"
        xmlns="http://www.w3.org/2000/svg"
        width="50px"
        height="50px"
        viewBox="0 0 100 100"
      >
        <path d="M 50,50 L 33,60.5 a 20 20 -210 1 1 34,0 z" fill="blue">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </path>
        <circle cx="50" cy="50" r="16" fill="#fff"></circle>
      </svg>
    </div>
  );
};

export default Cell;

const Prompt = (props) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission refresh
      props.submitPrompt(
        props.content.parent_header.msg_id,
        props.content.parent_header,
        inputValue
      );
      setInputValue(''); // Clear input after submission
      props.toggleShowPrompt();
    }
  };

  return (
    <div>
      <input
        type="name"
        name="prompt"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Type something and press Enter"
      />
    </div>
  );
};
