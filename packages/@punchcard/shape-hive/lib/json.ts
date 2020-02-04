import { Mapper, Shape, TimestampShape, Value } from '@punchcard/shape';
import json = require('@punchcard/shape-json');
import moment = require('moment');

import { DataFormat } from '@aws-cdk/aws-glue';
import { DataType } from './data-type';

/**
 * JSON Mapper specifically for AWS Glue (Hive JSON Format) which
 * requires timestamps be stored as `YYYY-MM-DD HH:mm:ss.SSS`.
 */
export class JsonMapperVisitor extends json.MapperVisitor {
  public static readonly instance = new JsonMapperVisitor();

  public timestampShape(shape: TimestampShape): Mapper<Date, string> {
    return {
      // TODO: why the f doesn't athena support ISO8601 string lol
      write: (value: Date) => moment.utc(value).format('YYYY-MM-DD HH:mm:ss.SSS'),
      read: (value: string) => moment.utc(value).toDate()
    };
  }
}

export class JsonDataType implements DataType {
  public static readonly instance = new JsonDataType();

  public readonly format = DataFormat.Json;

  public readonly extension: 'json' = 'json';

  public mapper<T extends Shape>(type: T): Mapper<Value.Of<T>, Buffer> {
    const jsonMapper = json.mapper(type, {
      visitor: JsonMapperVisitor.instance
    });

    return {
      read: buffer => jsonMapper.read(JSON.parse(buffer.toString('utf8'))) as any,
      write: value => Buffer.from(JSON.stringify(jsonMapper.write(value as any)) + '\n', 'utf8')
    };
  }

  public *split(buffer: Buffer): Iterable<Buffer> {
    const lines = buffer.toString('utf8').split('\n');
    for (const line of lines) {
      if (line.length > 0) {
        yield Buffer.from(line, 'utf8');
      }
    }
  }

  public join(buffers: Buffer[]): Buffer {
    return Buffer.concat(buffers);
  }
}

const newLine = Buffer.from('\n', 'utf8');