import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type MongoDoc = {
  toObject?: () => any;
  _id?: any;
  [key: string]: any;
}

export function convertDocToObj(doc: MongoDoc | MongoDoc[] | null): any {
  if (!doc) return null;
  
  // If it's an array, map over it
  if (Array.isArray(doc)) {
    return doc.map(item => convertDocToObj(item));
  }
  
  // If it's a mongoose document, convert to plain object
  if (doc.toObject) {
    const obj = doc.toObject();
    // Convert ObjectId to string
    if (obj._id) {
      obj._id = obj._id.toString();
    }
    // Convert any nested ObjectIds
    Object.keys(obj).forEach(key => {
      if (obj[key] && obj[key].toString && typeof obj[key].toString === 'function') {
        obj[key] = obj[key].toString();
      }
    });
    return obj;
  }
  
  // If it's a plain object, process its properties
  if (typeof doc === 'object') {
    const obj = { ...doc };
    if (obj._id) {
      obj._id = obj._id.toString();
    }
    Object.keys(obj).forEach(key => {
      if (obj[key] && obj[key].toString && typeof obj[key].toString === 'function') {
        obj[key] = obj[key].toString();
      }
    });
    return obj;
  }
  
  return doc;
}
