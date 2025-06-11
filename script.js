document.addEventListener('DOMContentLoaded', () => {
    const guiCanvas = document.getElementById('guiCanvas');
    const generatedCodeElement = document.getElementById('generatedCode');
    const paletteItems = document.querySelectorAll('.palette-item');
    const clearCanvasBtn = document.getElementById('clearCanvas');
    const propertiesPanel = document.getElementById('propertiesPanel');
    const elementPropertiesDiv = document.getElementById('elementProperties');
    const noElementSelectedDiv = document.getElementById('noElementSelected');

    const formPropertiesDiv = document.querySelector('.form-properties');

    let formName = 'UserForm';
    let formTitle = '';
    let formWidthPML = 44;
    let formHeightPML = 16.96;

    let elementsOnCanvas = [];
    let elementCounter = 0;
    let selectedElementId = null;

    let isDragging = false;
    let currentDraggable = null;
    let offsetX, offsetY;

    const GRID_SNAP_X = 0.5; // 0.5 unidade PML
    const GRID_SNAP_Y = 1;   // 1 unidade PML

    const SNAP_THRESHOLD = 10; // ou até 15
    let activeSnapLines = [];

    const CANVAS_UNIT_MULTIPLIER = 10; // 1 unidade PML = 10px

    // --- Funções Auxiliares ---

    function updateCanvasSizeAndElements() {
        guiCanvas.style.width = `${formWidthPML * CANVAS_UNIT_MULTIPLIER}px`;
        guiCanvas.style.height = `${formHeightPML * CANVAS_UNIT_MULTIPLIER}px`;

        elementsOnCanvas.forEach(elData => {
            const domEl = document.querySelector(`.gui-element[data-id="${elData.id}"]`);
            if (domEl) {
                let newLeft = elData.left;
                let newTop = elData.top;
                let newWidth = elData.width;
                let newHeight = elData.height;

                newLeft = Math.max(0, Math.min(newLeft, guiCanvas.offsetWidth - newWidth));
                newTop = Math.max(0, Math.min(newTop, guiCanvas.offsetHeight - newHeight));
                
                newWidth = Math.min(newWidth, guiCanvas.offsetWidth);
                newHeight = Math.min(newHeight, guiCanvas.offsetHeight);

                elData.left = newLeft;
                elData.top = newTop;
                elData.width = newWidth;
                elData.height = newHeight;

                domEl.style.left = `${newLeft}px`;
                domEl.style.top = `${newTop}px`;
                if (elData.type !== 'Toggle') {
                    domEl.style.width = `${newWidth}px`;
                    domEl.style.height = `${newHeight}px`;
                }

                applyContentScaling(domEl, elData);
            }
        });
        generateCode();
    }

    function generateUniqueId(type) {
        elementCounter++;
        return `.${type.toLowerCase().replace(' ', '')}${elementCounter}`;
    }

    function pxToPML(pixels) {
        return Math.round((pixels / CANVAS_UNIT_MULTIPLIER) * 100) / 100;
    }

    function pmlToPx(pmlUnits) {
        return pmlUnits * CANVAS_UNIT_MULTIPLIER;
    }

    function applyContentScaling(elementDom, elementData) {
        const contentContainer = elementDom.querySelector('span') || elementDom.querySelector('.display-content');
        if (!contentContainer) return;

        // Resetar a escala para medir o tamanho "natural" do conteúdo
        contentContainer.style.transform = 'scale(1)';
        
        // Temporariamente remove ellipsis para medir o scrollWidth real
        const originalTextOverflow = contentContainer.style.textOverflow;
        contentContainer.style.textOverflow = 'clip';
        const originalWhiteSpace = contentContainer.style.whiteSpace;
        contentContainer.style.whiteSpace = 'nowrap'; // Garante que o texto não quebre linha para medir largura

        const contentWidth = contentContainer.scrollWidth;
        const contentHeight = contentContainer.scrollHeight;

        // Restaura as propriedades originais
        contentContainer.style.textOverflow = originalTextOverflow;
        contentContainer.style.whiteSpace = originalWhiteSpace;


        const elementWidth = elementDom.offsetWidth;
        const elementHeight = elementDom.offsetHeight;

        let padding = 6;

        if (elementData.type === 'Paragraph' || elementData.type === 'List') {
            padding = 0;
        } else if (elementData.type === 'Text' || elementData.type === 'Dropdown') {
            padding = 6;
        } else if (elementData.type === 'Toggle') {
             const iconWidth = 18;
             padding = iconWidth;
        }

        if (contentWidth === 0 || contentHeight === 0 || elementWidth === 0 || elementHeight === 0) {
            contentContainer.style.transform = 'scale(1)';
            return;
        }

        const scaleX = (elementWidth - padding) / contentWidth;
        const scaleY = (elementHeight - padding) / contentHeight;

        const finalScale = Math.min(scaleX, scaleY, 1);
        contentContainer.style.transform = `scale(${finalScale})`;
    }

    function generateCode() {
        let gadgetsCode = '';
        elementsOnCanvas.forEach(element => { // <-- corrigido aqui
            const x = pxToPML(element.left);
            const y = pxTopToPML(element.top);
            const width = pxToPML(element.width);
            const height = pxHeightToPML(element.height);

            switch (element.type) {
                case 'Button':
                    gadgetsCode += `button ${element.id} '${element.text}' at x${x} y${y} width ${width} height ${height}\n`;
                    break;
                case 'Toggle':
                    gadgetsCode += `toggle ${element.id} '${element.tagText}' at x${x} y${y}\n`;
                    break;
                case 'Paragraph':
                    gadgetsCode += `paragraph ${element.id} at x${x} y${y} text '${element.content}' width ${width} height ${height}\n`;
                    break;
                case 'Text':
                    gadgetsCode += `text ${element.id} '${element.initialValue}' at x${x} y${y} width ${width} is ${element.valueType}\n`;
                    break;
                case 'Dropdown':
                    gadgetsCode += `option ${element.id} '${element.optionText}' at x${x} y${y} width ${width}\n`;
                    break;
                case 'List':
                    gadgetsCode += `list ${element.id} '${element.listText}' at x${x} y${y} width ${width} height ${height}\n`;
                    break;
            }
        });

        const formSizeLine = `setup form !!${formName} size ${formWidthPML} ${formHeightPML}`;
        const formTitleLine = formTitle ? `title '${formTitle}'` : '';

        generatedCodeElement.textContent = `
--#region Online PML Form Designer generated code
--#region Form definition
${formSizeLine}
${formTitleLine ? formTitleLine + '\n' : ''}-- (Form Title)
--#region Gadgets
${gadgetsCode || '-- Adicione elementos para gerar o código...'}
--#endregion Gadgets
exit
--#endregion Form definition

--#region Methods
--#endregion Methods
--#endregion Online PML Form Designer generated code
        `.trim();
    }

    // --- Painel de Propriedades da Forma ---
    function renderFormProperties() {
        formPropertiesDiv.innerHTML = '<h2>Propriedades da Forma</h2>';

        const table = document.createElement('table');
        table.className = 'prop-table';
        const tbody = document.createElement('tbody');

        // Nome da Forma
        let trName = document.createElement('tr');
        let tdLabelName = document.createElement('td');
        tdLabelName.className = 'prop-label';
        tdLabelName.textContent = 'Nome';
        let tdInputName = document.createElement('td');
        let inputName = document.createElement('input');
        inputName.type = 'text';
        inputName.value = formName;
        inputName.oninput = (e) => {
            formName = e.target.value;
            generateCode();
        };
        tdInputName.appendChild(inputName);
        trName.appendChild(tdLabelName);
        trName.appendChild(tdInputName);
        tbody.appendChild(trName);

        // Largura
        let trWidth = document.createElement('tr');
        let tdLabelWidth = document.createElement('td');
        tdLabelWidth.className = 'prop-label';
        tdLabelWidth.textContent = 'Largura (PML)';
        let tdInputWidth = document.createElement('td');
        let inputWidth = document.createElement('input');
        inputWidth.type = 'number';
        inputWidth.value = formWidthPML;
        inputWidth.step = '0.01';
        inputWidth.min = '10';
        inputWidth.oninput = (e) => {
            formWidthPML = parseFloat(e.target.value) || 10;
            updateCanvasSizeAndElements();
        };
        tdInputWidth.appendChild(inputWidth);
        trWidth.appendChild(tdLabelWidth);
        trWidth.appendChild(tdInputWidth);
        tbody.appendChild(trWidth);

        // Título
        let trTitle = document.createElement('tr');
        let tdLabelTitle = document.createElement('td');
        tdLabelTitle.className = 'prop-label';
        tdLabelTitle.textContent = 'Título';
        let tdInputTitle = document.createElement('td');
        let inputTitle = document.createElement('input');
        inputTitle.type = 'text';
        inputTitle.value = formTitle;
        inputTitle.oninput = (e) => {
            formTitle = e.target.value;
            generateCode();
        };
        tdInputTitle.appendChild(inputTitle);
        trTitle.appendChild(tdLabelTitle);
        trTitle.appendChild(tdInputTitle);
        tbody.appendChild(trTitle);

        // Altura
        let trHeight = document.createElement('tr');
        let tdLabelHeight = document.createElement('td');
        tdLabelHeight.className = 'prop-label';
        tdLabelHeight.textContent = 'Altura (PML)';
        let tdInputHeight = document.createElement('td');
        let inputHeight = document.createElement('input');
        inputHeight.type = 'number';
        inputHeight.value = formHeightPML;
        inputHeight.step = '0.01';
        inputHeight.min = '10';
        inputHeight.oninput = (e) => {
            formHeightPML = parseFloat(e.target.value) || 10;
            updateCanvasSizeAndElements();
        };
        tdInputHeight.appendChild(inputHeight);
        trHeight.appendChild(tdLabelHeight);
        trHeight.appendChild(tdInputHeight);
        tbody.appendChild(trHeight);

        table.appendChild(tbody);
        formPropertiesDiv.appendChild(table);
    }


    // --- Painel de Propriedades do Elemento ---
    function renderPropertiesPanel(elementData) {
        elementPropertiesDiv.innerHTML = '';
        if (!elementData) {
            noElementSelectedDiv.style.display = 'block';
            elementPropertiesDiv.style.display = 'none';
            return;
        }
        noElementSelectedDiv.style.display = 'none';
        elementPropertiesDiv.style.display = 'block';

        const table = document.createElement('table');
        table.className = 'prop-table';
        const tbody = document.createElement('tbody');

        // Propriedades comuns
        [
            { label: 'Left (px)', prop: 'left', type: 'number' },
            { label: 'Top (px)', prop: 'top', type: 'number' },
            { label: 'Largura (px)', prop: 'width', type: 'number' },
            { label: 'Altura (px)', prop: 'height', type: 'number' }
        ].forEach(({label, prop, type}) => {
            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.className = 'prop-label';
            tdLabel.textContent = label;
            const tdInput = document.createElement('td');
            const input = document.createElement('input');
            input.type = type;
            input.value = elementData[prop];
            input.id = `prop-${prop}-${elementData.id}`;
            input.oninput = (e) => {
                elementData[prop] = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
                // Atualiza o DOM do elemento na área da GUI
                const domEl = document.querySelector(`.gui-element[data-id="${elementData.id}"]`);
                if (domEl) {
                    if (prop === 'left') domEl.style.left = elementData.left + 'px';
                    if (prop === 'top') domEl.style.top = elementData.top + 'px';
                    if (prop === 'width') domEl.style.width = elementData.width + 'px';
                    if (prop === 'height') domEl.style.height = elementData.height + 'px';
                }
                generateCode();
            };
            tdInput.appendChild(input);
            tr.appendChild(tdLabel);
            tr.appendChild(tdInput);
            tbody.appendChild(tr);
        });

        // Propriedades específicas por tipo
        if (elementData.type === 'Button') {
            // Texto do botão
            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.className = 'prop-label';
            tdLabel.textContent = 'Texto';
            const tdInput = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = elementData.text;
            input.oninput = (e) => {
                elementData.text = e.target.value;
                // Atualiza o texto no botão na tela
                const domEl = document.querySelector(`.gui-element[data-id="${elementData.id}"] span`);
                if (domEl) domEl.textContent = e.target.value;
                generateCode();
            };
            tdInput.appendChild(input);
            tr.appendChild(tdLabel);
            tr.appendChild(tdInput);
            tbody.appendChild(tr);
        } else if (elementData.type === 'Toggle') {
            // Texto do toggle
            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.className = 'prop-label';
            tdLabel.textContent = 'Texto';
            const tdInput = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = elementData.tagText;
            input.oninput = (e) => {
                elementData.tagText = e.target.value;
                const domEl = document.querySelector(`.gui-element[data-id="${elementData.id}"] span`);
                if (domEl) domEl.textContent = e.target.value;
                generateCode();
            };
            tdInput.appendChild(input);
            tr.appendChild(tdLabel);
            tr.appendChild(tdInput);
            tbody.appendChild(tr);
        } else if (elementData.type === 'Paragraph') {
            // Texto do parágrafo
            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.className = 'prop-label';
            tdLabel.textContent = 'Texto';
            const tdInput = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = elementData.content;
            input.oninput = (e) => {
                elementData.content = e.target.value;
                const domEl = document.querySelector(`.gui-element[data-id="${elementData.id}"] span`);
                if (domEl) domEl.textContent = e.target.value;
                generateCode();
            };
            tdInput.appendChild(input);
            tr.appendChild(tdLabel);
            tr.appendChild(tdInput);
            tbody.appendChild(tr);
        } else if (elementData.type === 'Text') {
            // Valor inicial
            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.className = 'prop-label';
            tdLabel.textContent = 'Valor inicial';
            const tdInput = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = elementData.initialValue;
            input.oninput = (e) => {
                elementData.initialValue = e.target.value;
                const domEl = document.querySelector(`.gui-element[data-id="${elementData.id}"] .display-content`);
                if (domEl) domEl.textContent = e.target.value;
                generateCode();
            };
            tdInput.appendChild(input);
            tr.appendChild(tdLabel);
            tr.appendChild(tdInput);
            tbody.appendChild(tr);

            // Tipo de valor
            const trType = document.createElement('tr');
            const tdLabelType = document.createElement('td');
            tdLabelType.className = 'prop-label';
            tdLabelType.textContent = 'Tipo';
            const tdInputType = document.createElement('td');
            const select = document.createElement('select');
            ['STRING', 'REAL'].forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if (elementData.valueType === opt) option.selected = true;
                select.appendChild(option);
            });
            select.onchange = (e) => {
                elementData.valueType = e.target.value;
                generateCode();
            };
            tdInputType.appendChild(select);
            trType.appendChild(tdLabelType);
            trType.appendChild(tdInputType);
            tbody.appendChild(trType);
        } else if (elementData.type === 'Dropdown') {
            // Texto do dropdown
            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.className = 'prop-label';
            tdLabel.textContent = 'Texto';
            const tdInput = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = elementData.optionText;
            input.oninput = (e) => {
                elementData.optionText = e.target.value;
                const domEl = document.querySelector(`.gui-element[data-id="${elementData.id}"] span`);
                if (domEl) domEl.textContent = e.target.value;
                generateCode();
            };
            tdInput.appendChild(input);
            tr.appendChild(tdLabel);
            tr.appendChild(tdInput);
            tbody.appendChild(tr);
        } else if (elementData.type === 'List') {
            // Texto da lista
            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.className = 'prop-label';
            tdLabel.textContent = 'Texto';
            const tdInput = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = elementData.listText;
            input.oninput = (e) => {
                elementData.listText = e.target.value;
                const domEl = document.querySelector(`.gui-element[data-id="${elementData.id}"] span`);
                if (domEl) domEl.textContent = e.target.value;
                generateCode();
            };
            tdInput.appendChild(input);
            tr.appendChild(tdLabel);
            tr.appendChild(tdInput);
            tbody.appendChild(tr);
        }

        // Linha para o botão de deletar
        const trDelete = document.createElement('tr');
        const tdLabelDelete = document.createElement('td');
        tdLabelDelete.className = 'prop-label';
        tdLabelDelete.textContent = ''; // sem label
        const tdInputDelete = document.createElement('td');
        const btnDelete = document.createElement('button');
        btnDelete.textContent = 'Excluir elemento';
        btnDelete.style.background = '#e74c3c';
        btnDelete.style.color = '#fff';
        btnDelete.style.border = 'none';
        btnDelete.style.borderRadius = '4px';
        btnDelete.style.padding = '6px 10px';
        btnDelete.style.cursor = 'pointer';
        btnDelete.onclick = () => {
            // Remover o elemento do array e do DOM
            elementsOnCanvas = elementsOnCanvas.filter(el => el.id !== elementData.id);
            const domEl = document.querySelector(`.gui-element[data-id="${elementData.id}"]`);
            if (domEl) domEl.remove();
            selectedElementId = null;
            renderPropertiesPanel(null);
            generateCode();
        };
        tdInputDelete.appendChild(btnDelete);
        trDelete.appendChild(tdLabelDelete);
        trDelete.appendChild(tdInputDelete);
        tbody.appendChild(trDelete);

        table.appendChild(tbody);
        elementPropertiesDiv.appendChild(table);
    }

    // Adicionado um parâmetro `isElementProp` para controlar se o renderPropertiesPanel é chamado
    function createPropInput(parentDiv, labelText, propName, value, type = 'text', options = [], onChangeCallback = null, isElementProp = false) {
        const propGroup = document.createElement('div');
        propGroup.className = 'prop-group';

        const label = document.createElement('label');
        label.textContent = labelText;
        propGroup.appendChild(label);

        let input;
        if (type === 'select') {
            input = document.createElement('select');
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                input.appendChild(option);
            });
            input.value = value;
        } else {
            input = document.createElement('input');
            input.type = type;
            input.value = value;
            input.id = `prop-${propName}-${selectedElementId || 'form'}`; // ID único para o input
        }

        const handleInput = (e) => {
            const val = (type === 'number') ? parseFloat(e.target.value) || 0 : e.target.value;
            
            // Se houver um callback específico (usado para propriedades da forma ou lógicas complexas)
            if (onChangeCallback) {
                onChangeCallback(val);
            } else {
                // Lógica padrão para propriedades de elemento
                const elementData = elementsOnCanvas.find(el => el.id === selectedElementId);
                if (elementData) {
                    elementData[propName] = val;
                    // NÂO CHAME renderPropertiesPanel(elementData) AQUI
                    // Isso causaria o redesenho e a perda de foco.
                    // Apenas atualize a GUI e gere o código.
                    const domElement = document.querySelector(`.gui-element[data-id="${selectedElementId}"]`);
                    if (domElement) {
                        // Atualiza o texto na GUI para elementos com span ou display-content
                        if (domElement.querySelector('span')) {
                            domElement.querySelector('span').textContent = val;
                        } else if (domElement.querySelector('.display-content')) {
                            domElement.querySelector('.display-content').textContent = val;
                        }
                        applyContentScaling(domElement, elementData);
                    }
                    generateCode();
                }
            }
        };

        input.addEventListener('input', handleInput);
        if (type === 'checkbox') {
            input.checked = value;
            input.addEventListener('change', handleInput);
        }

        propGroup.appendChild(input);
        parentDiv.appendChild(propGroup);
    }

    // --- Gerenciamento de Elementos no Canvas ---

    function createElementDiv(id, type, initialProps) {
        const div = document.createElement('div');
        div.className = 'gui-element';
        div.dataset.id = id;
        div.dataset.type = type;
        div.style.left = `${initialProps.left}px`;
        div.style.top = `${initialProps.top}px`;
        div.style.width = `${initialProps.width}px`;
        div.style.height = `${initialProps.height}px`;

        return div;
    }

    function createButtonElement(id, props) {
        const div = createElementDiv(id, 'Button', props);
        const span = document.createElement('span');
        span.textContent = props.text;
        div.appendChild(span);
        return div;
    }

    function createToggleElement(id, props) {
        const div = createElementDiv(id, 'Toggle', props);
        const span = document.createElement('span');
        span.textContent = props.tagText;
        div.appendChild(span);
        return div;
    }

    function createParagraphElement(id, props) {
        const div = createElementDiv(id, 'Paragraph', props);
        const span = document.createElement('span');
        span.textContent = props.content;
        div.appendChild(span);
        return div;
    }

    function createTextElement(id, props) {
        const div = createElementDiv(id, 'Text', props);
        const displayContent = document.createElement('div');
        displayContent.className = 'display-content';
        displayContent.textContent = props.initialValue;
        div.appendChild(displayContent);
        return div;
    }

    function createDropdownElement(id, props) {
        const div = createElementDiv(id, 'Dropdown', props);
        const span = document.createElement('span');
        span.textContent = props.optionText;
        div.appendChild(span);
        return div;
    }

    function createListElement(id, props) {
        const div = createElementDiv(id, 'List', props);
        const span = document.createElement('span');
        span.textContent = props.listText;
        div.appendChild(span);
        return div;
    }

    function addElementToCanvas(type, initialClickX, initialClickY) {
        const id = generateUniqueId(type);

        let defaultWidth;
        let defaultHeight;
        let minWidth = 50;
        let minHeight = 23;

        switch (type) {
            case 'Button':
                defaultWidth = 75;
                defaultHeight = 23;
                break;
            case 'Toggle':
                defaultWidth = 100;
                defaultHeight = 18;
                minWidth = 20;
                minHeight = 18;
                break;
            case 'Paragraph':
                defaultWidth = 120;
                defaultHeight = 18;
                minHeight = 18;
                break;
            case 'Text':
                defaultWidth = 150;
                defaultHeight = 23;
                break;
            case 'Dropdown':
                defaultWidth = 120;
                defaultHeight = 23;
                break;
            case 'List':
                defaultWidth = 120;
                defaultHeight = 60;
                minHeight = 40;
                break;
            default:
                console.error('Tipo de elemento desconhecido:', type);
                return;
        }

        const spawnX = initialClickX - (defaultWidth / 2);
        const spawnY = initialClickY - (defaultHeight / 2);

        let elementData;
        let newElementDOM;

        const commonProps = {
            id: id,
            left: spawnX,
            top: spawnY,
            width: defaultWidth,
            height: defaultHeight,
            minWidth: minWidth,
            minHeight: minHeight
        };

        switch (type) {
            case 'Button':
                elementData = { ...commonProps, type: 'Button', text: 'Botão' };
                newElementDOM = createButtonElement(id, elementData);
                break;
            case 'Toggle':
                elementData = { ...commonProps, type: 'Toggle', tagText: 'Alternador' };
                newElementDOM = createToggleElement(id, elementData);
                newElementDOM.style.width = '';
                newElementDOM.style.height = `${elementData.height}px`;
                break;
            case 'Paragraph':
                elementData = { ...commonProps, type: 'Paragraph', content: 'Label' };
                newElementDOM = createParagraphElement(id, elementData);
                break;
            case 'Text':
                elementData = { ...commonProps, type: 'Text', initialValue: 'Campo de Texto', valueType: 'STRING' };
                newElementDOM = createTextElement(id, elementData);
                break;
            case 'Dropdown':
                elementData = { ...commonProps, type: 'Dropdown', optionText: 'Item 1' };
                newElementDOM = createDropdownElement(id, elementData);
                break;
            case 'List':
                elementData = { ...commonProps, type: 'List', listText: 'Lista de Itens' };
                newElementDOM = createListElement(id, elementData);
                newElementDOM.style.height = `${elementData.height}px`;
                break;
            default:
                console.error('Tipo de elemento desconhecido:', type);
                return;
        }

        elementsOnCanvas.push(elementData);
        guiCanvas.appendChild(newElementDOM);
        selectElement(id);
        applyContentScaling(newElementDOM, elementData);
        generateCode();
    }

    function removeElement(id) {
        const elementToRemove = document.querySelector(`.gui-element[data-id="${id}"]`);
        if (elementToRemove) {
            guiCanvas.removeChild(elementToRemove);
        }
        elementsOnCanvas = elementsOnCanvas.filter(el => el.id !== id);
        if (selectedElementId === id) {
            selectedElementId = null;
            renderPropertiesPanel(null);
        }
        generateCode();
    }

    function clearCanvas() {
        if (confirm('Tem certeza que deseja limpar toda a tela? Isso removerá todos os elementos.')) {
            const h2Title = guiCanvas.querySelector('h2');
            guiCanvas.innerHTML = '';
            if(h2Title) guiCanvas.appendChild(h2Title);
            elementsOnCanvas = [];
            elementCounter = 0;
            selectedElementId = null;
            renderPropertiesPanel(null);
            generateCode();
        }
    }

    function selectElement(id) {
        document.querySelectorAll('.gui-element').forEach(el => el.classList.remove('selected'));
        const elementDOM = document.querySelector(`.gui-element[data-id="${id}"]`);
        if (elementDOM) {
            elementDOM.classList.add('selected');
            selectedElementId = id;
            const elementData = elementsOnCanvas.find(el => el.id === id);
            renderPropertiesPanel(elementData); // Renderiza o painel para o elemento selecionado
        }
    }

    // --- Funções de Snap Lines (Alinhamento Apenas Pelo Centro) ---

    function getSnapTargets(draggingElementId) {
        const targets = [];
        elementsOnCanvas.forEach(el => {
            if (el.id === draggingElementId) return;

            const domEl = document.querySelector(`.gui-element[data-id="${el.id}"]`);
            if (!domEl) return;

            const centerX = domEl.offsetLeft + domEl.offsetWidth / 2;
            const centerY = domEl.offsetTop + domEl.offsetHeight / 2;

            targets.push(
                { type: 'vertical', pos: centerX, id: el.id, side: 'centerX' },
                { type: 'horizontal', pos: centerY, id: el.id, side: 'centerY' }
            );
        });

        targets.push(
            { type: 'vertical', pos: guiCanvas.offsetWidth / 2, id: 'canvas', side: 'centerX' },
            { type: 'horizontal', pos: guiCanvas.offsetHeight / 2, id: 'canvas', side: 'centerY' }
        );

        return targets;
    }

    function showSnapLine(orientation, position) {
        let line = document.createElement('div');
        line.className = `snap-line ${orientation}`;
        if (orientation === 'horizontal') {
            line.style.top = `${position}px`;
        } else {
            line.style.left = `${position}px`;
        }
        guiCanvas.appendChild(line);
        activeSnapLines.push(line);
    }

    function hideSnapLines() {
        activeSnapLines.forEach(line => line.remove());
        activeSnapLines = [];
    }


    // --- Event Listeners ---

    paletteItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            const canvasRect = guiCanvas.getBoundingClientRect();
            const initialX = guiCanvas.scrollLeft + (canvasRect.width / 2);
            const initialY = guiCanvas.scrollTop + (canvasRect.height / 2);
            addElementToCanvas(type, initialX, initialY);
        });
    });

    clearCanvasBtn.addEventListener('click', clearCanvas);

    guiCanvas.addEventListener('mousedown', (e) => {
        const element = e.target.closest('.gui-element');
        if (element) {
            selectElement(element.dataset.id);

            isDragging = true;
            currentDraggable = element;
            offsetX = e.clientX - currentDraggable.getBoundingClientRect().left;
            offsetY = e.clientY - currentDraggable.getBoundingClientRect().top;
            
            e.preventDefault();
        } else if (e.target.id === 'guiCanvas') {
            selectedElementId = null;
            document.querySelectorAll('.gui-element').forEach(el => el.classList.remove('selected'));
            renderPropertiesPanel(null);
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !currentDraggable) return;

        hideSnapLines();

        const canvasRect = guiCanvas.getBoundingClientRect();
        let newLeft = e.clientX - offsetX - canvasRect.left;
        let newTop = e.clientY - offsetY - canvasRect.top;

        const currentElementWidth = currentDraggable.offsetWidth;
        const currentElementHeight = currentDraggable.offsetHeight;

        const currentRect = {
            centerX: newLeft + currentElementWidth / 2,
            centerY: newTop + currentElementHeight / 2
        };

        const snapTargets = getSnapTargets(currentDraggable.dataset.id);
        let snappedX = false;
        let snappedY = false;

        snapTargets.filter(t => t.type === 'vertical').forEach(target => {
            const distance = Math.abs(currentRect.centerX - target.pos);
            if (distance < SNAP_THRESHOLD) {
                newLeft = target.pos - (currentElementWidth / 2);
                showSnapLine('vertical', target.pos);
                snappedX = true;
            }
        });

        snapTargets.filter(t => t.type === 'horizontal').forEach(target => {
            const distance = Math.abs(currentRect.centerY - target.pos);
            if (distance < SNAP_THRESHOLD) {
                newTop = target.pos - (currentElementHeight / 2);
                showSnapLine('horizontal', target.pos);
                snappedY = true;
            }
        });

        if (!snappedX) {
            // Snap horizontal de 0.5 unidade PML (5px)
            const snapPxX = GRID_SNAP_X * CANVAS_UNIT_MULTIPLIER;
            newLeft = Math.round(newLeft / snapPxX) * snapPxX;
        }
        if (!snappedY) {
            // Snap vertical de 1 unidade PML (10px)
            const snapPxY = GRID_SNAP_Y * CANVAS_UNIT_MULTIPLIER;
            newTop = Math.round(newTop / snapPxY) * snapPxY;
        }

        newLeft = Math.max(0, Math.min(newLeft, guiCanvas.offsetWidth - currentElementWidth));
        newTop = Math.max(0, Math.min(newTop, guiCanvas.offsetHeight - currentElementHeight));

        currentDraggable.style.left = `${newLeft}px`;
        currentDraggable.style.top = `${newTop}px`;

        const draggingElementData = elementsOnCanvas.find(el => el.id === currentDraggable.dataset.id);
        if (draggingElementData) {
            draggingElementData.left = newLeft;
            draggingElementData.top = newTop;
            generateCode();
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (isDragging) {
            isDragging = false;
            currentDraggable = null;
            hideSnapLines();
            // Ao soltar, atualiza as propriedades Left/Top no painel, mas sem redesenhar TUDO
            if (selectedElementId) {
                const elementData = elementsOnCanvas.find(el => el.id === selectedElementId);
                if (elementData) {
                    const currentElementDOM = document.querySelector(`.gui-element[data-id="${selectedElementId}"]`);
                    if (currentElementDOM) {
                         // Atualiza apenas os campos Left e Top do painel sem redesenhar tudo
                        const leftInput = document.getElementById(`prop-left-${selectedElementId}`);
                        const topInput = document.getElementById(`prop-top-${selectedElementId}`);
                        if (leftInput) leftInput.value = elementData.left;
                        if (topInput) topInput.value = elementData.top;
                    }
                }
            }
            generateCode();
        }

        const element = e.target.closest('.gui-element');
        if (element && element.dataset.id) {
            const elementData = elementsOnCanvas.find(el => el.id === element.dataset.id);
            if (elementData) {
                const newWidth = element.offsetWidth;
                const newHeight = element.offsetHeight;

                if (elementData.type !== 'Toggle' && (elementData.width !== newWidth || elementData.height !== newHeight)) {
                    elementData.width = newWidth;
                    elementData.height = newHeight;
                    applyContentScaling(element, elementData);
                    generateCode();
                    // Atualiza apenas os campos Width e Height do painel
                    const widthInput = document.getElementById(`prop-width-${selectedElementId}`);
                    const heightInput = document.getElementById(`prop-height-${selectedElementId}`);
                    if (widthInput) widthInput.value = elementData.width;
                    if (heightInput) heightInput.value = elementData.height;
                } else if (elementData.type === 'Toggle') {
                    applyContentScaling(element, elementData);
                    generateCode();
                }
            }
        }
    });

    const resizeObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.attributeName === 'style' && mutation.target.classList.contains('gui-element')) {
                const element = mutation.target;
                const elementData = elementsOnCanvas.find(el => el.id === element.dataset.id);
                if (elementData) {
                    const newWidth = element.offsetWidth;
                    const newHeight = element.offsetHeight;

                    if (elementData.type !== 'Toggle' && (elementData.width !== newWidth || elementData.height !== newHeight)) {
                        elementData.width = newWidth;
                        elementData.height = newHeight;
                        applyContentScaling(element, elementData);
                        generateCode();
                        if (selectedElementId === element.dataset.id) {
                            // Atualiza os inputs do painel sem redesenhar
                            const widthInput = document.getElementById(`prop-width-${selectedElementId}`);
                            const heightInput = document.getElementById(`prop-height-${selectedElementId}`);
                            if (widthInput) widthInput.value = elementData.width;
                            if (heightInput) heightInput.value = elementData.height;
                        }
                    } else if (elementData.type === 'Toggle') {
                        applyContentScaling(element, elementData);
                        generateCode();
                    }
                }
            }
        });
    });

    resizeObserver.observe(guiCanvas, { attributes: true, subtree: true, attributeFilter: ['style'] });


    // Inicializa o código e o tamanho do canvas quando a página carrega
    renderFormProperties();
    updateCanvasSizeAndElements();
    renderPropertiesPanel(null);

    function pxTopToPML(topPx) {
        // Considera a altura real do canvas e do form em PML
        const canvasHeightPx = formHeightPML * CANVAS_UNIT_MULTIPLIER;
        if (canvasHeightPx === 0) return 0;
        return Math.round((topPx / canvasHeightPx) * formHeightPML * 100) / 100;
    }

    function pxHeightToPML(heightPx) {
        const canvasHeightPx = formHeightPML * CANVAS_UNIT_MULTIPLIER;
        if (canvasHeightPx === 0) return 0;
        return Math.round((heightPx / canvasHeightPx) * formHeightPML * 100) / 100;
    }
});