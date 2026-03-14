// Low-code editor for expressions
// Parses components from expressions.html and allows building structures

interface Component {
  name: string;
  template: string;
}

class Argument {
  private container: HTMLElement;
  private chooseButton: HTMLButtonElement;
  private contentContainer: HTMLElement;
  private addButton?: HTMLButtonElement;
  private currentExpression?: Expression;

  constructor(private editor: Editor, private isInBlock: boolean = false) {
    this.container = document.createElement('div');
    this.container.className = 'argument';

    this.chooseButton = document.createElement('button');
    this.chooseButton.textContent = 'Choose Expression';
    this.chooseButton.onclick = () => this.showComponentChooser();
    this.container.appendChild(this.chooseButton);

    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'argument-content';
    this.container.appendChild(this.contentContainer);

    if (isInBlock) {
      this.addButton = document.createElement('button');
      this.addButton.textContent = 'Add Expression';
      this.addButton.onclick = () => this.addSubsequentExpression();
      this.container.appendChild(this.addButton);
    }
  }

  getElement(): HTMLElement {
    return this.container;
  }

  private showComponentChooser() {
    // Show a modal or dropdown with available components
    const modal = document.createElement('div');
    modal.className = 'component-chooser';
    modal.style.position = 'absolute';
    modal.style.background = 'white';
    modal.style.border = '1px solid black';
    modal.style.padding = '10px';

    this.editor.components.forEach((comp, index) => {
      const btn = document.createElement('button');
      btn.textContent = comp.name;
      btn.onclick = () => {
        this.setExpression(new Expression(this.editor, comp));
        document.body.removeChild(modal);
      };
      modal.appendChild(btn);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => document.body.removeChild(modal);
    modal.appendChild(cancelBtn);

    document.body.appendChild(modal);
  }

  private setExpression(expr: Expression) {
    if (this.currentExpression) {
      this.contentContainer.removeChild(this.currentExpression.getElement());
    }
    this.currentExpression = expr;
    this.contentContainer.appendChild(expr.getElement());
  }

  private addSubsequentExpression() {
    // For block arguments, add another expression after this one
    if (this.isInBlock && this.currentExpression) {
      const newArg = new Argument(this.editor, true);
      this.container.parentElement!.appendChild(newArg.getElement());
    }
  }
}

class Expression {
  private element: HTMLElement;
  private arguments: Argument[] = [];

  constructor(private editor: Editor, private component: Component) {
    this.element = document.createElement('div');
    this.element.className = 'expression ' + component.name.toLowerCase().replace(' ', '-');

    // Parse the template and replace <argument/> with Argument instances
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = component.template;

    this.processTemplate(tempDiv, this.element);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private processTemplate(template: HTMLElement, target: HTMLElement) {
    Array.from(template.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'ARGUMENT') {
          // Replace with Argument
          const isInBlock = this.hasBlockParent(el);
          const arg = new Argument(this.editor, isInBlock);
          this.arguments.push(arg);
          target.appendChild(arg.getElement());
        } else if (el.tagName === 'ENUM') {
          // Replace with select
          const select = document.createElement('select');
          // For now, add some default options, since ops.html not found
          ['+', '-', '*', '/'].forEach(op => {
            const option = document.createElement('option');
            option.value = op;
            option.textContent = op;
            select.appendChild(option);
          });
          target.appendChild(select);
          // Copy other elements
          const clone = el.cloneNode(true) as HTMLElement;
          target.appendChild(clone);
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        target.appendChild(node.cloneNode(true));
      }
    });
  }

  private hasBlockParent(el: HTMLElement): boolean {
    let parent = el.parentElement;
    while (parent) {
      if (parent.tagName === 'BLOCK') return true;
      parent = parent.parentElement;
    }
    return false;
  }
}

class Editor {
  components: Component[] = [];
  private root: HTMLElement;

  constructor(rootElement: HTMLElement) {
    this.root = rootElement;
    this.loadComponents();
    this.init();
  }

  private async loadComponents() {
    // Load expressions.html
    const response = await fetch('sample/expressions.html');
    const html = await response.text();

    // Split by <!--SEP-->
    const parts = html.split('<!--SEP-->');
    parts.forEach((part, index) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = part.trim();
      const expr = tempDiv.querySelector('expression');
      if (expr) {
        // Find the comment before the expression
        let name = `Component ${index + 1}`;
        const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_COMMENT);
        let comment: Comment | null;
        while (comment = walker.nextNode() as Comment) {
          if (comment.textContent && comment.textContent.trim()) {
            name = comment.textContent.trim();
            break;
          }
        }
        this.components.push({
          name: name,
          template: expr.innerHTML
        });
      }
    });
  }

  private init() {
    // Add a button to add root expressions
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Expression';
    addBtn.onclick = () => this.addRootExpression();
    this.root.appendChild(addBtn);
  }

  private addRootExpression() {
    const chooser = new Argument(this, false);
    this.root.appendChild(chooser.getElement());
  }
}

// Usage: new Editor(document.getElementById('editor')!);