import React from 'react';
import * as Blocks from './render-blocks';

const componentMap: { [key: string]: React.ElementType } = {
  Heading: Blocks.HeadingBlock,
  Paragraph: Blocks.ParagraphBlock,
  List: Blocks.ListBlock,
  Table: Blocks.TableBlock,
  Quote: Blocks.QuoteBlock,
  Callout: Blocks.CalloutBlock,
  Separator: Blocks.SeparatorBlock,
};

interface SchemaRendererProps {
  layout: any[];
}

export const SchemaRenderer: React.FC<SchemaRendererProps> = ({ layout }) => {
  if (!Array.isArray(layout)) {
    return (
      <Blocks.FallbackBlock componentName="Invalid Layout (Not an array)" />
    );
  }

  return (
    <>
      {layout.map((block, index) => {
        // AI might return component names in different cases, so we normalize to PascalCase
        const componentName = block.component?.charAt(0).toUpperCase() + block.component?.slice(1);
        const Component = componentMap[componentName];
        
        if (!Component) {
          return <Blocks.FallbackBlock key={index} componentName={block.component || 'Unknown'} />;
        }
        
        const { component, ...props } = block;
        return <Component key={index} {...props} />;
      })}
    </>
  );
};