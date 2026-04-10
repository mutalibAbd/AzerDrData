# -*- coding: utf-8 -*-
import json
import re

# Dosyayı oku
with open('icd10_hierarchy.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def fix_notes(notes):
    """
    Notları düzelt: ':' ile biten ana başl ve '·' ile başlayan alt maddeleri birleştir
    """
    if not notes or len(notes) == 0:
        return notes
    
    fixed_notes = []
    i = 0
    
    while i < len(notes):
        current = notes[i]
        name = current.get('name', '')
        
        # Eğer isim ':' ile bitiyorsa ve sonraki elemanlar '·' ile başlıyorsa
        if name.strip().endswith(':'):
            base_text = name.rstrip(':').strip()
            j = i + 1
            
            # Sonraki tüm '·' ile başlayan elemanları topla
            while j < len(notes) and notes[j].get('name', '').strip().startswith('·'):
                bullet_text = notes[j].get('name', '').strip()
                # '·' ve boşlukları temizle
                bullet_text = re.sub(r'^·\s*', '', bullet_text).strip()
                
                # Yeni nota ekle
                fixed_notes.append({
                    'id': len(fixed_notes),
                    'name': base_text + ' ' + bullet_text
                })
                j += 1
            
            # İşlenmiş elemanları atla
            i = j
        else:
            # Normal not, id'yi yeniden ayarla
            fixed_notes.append({
                'id': len(fixed_notes),
                'name': name
            })
            i += 1
    
    return fixed_notes

def process_item(item):
    """Recursive olarak tüm öğeleri işle"""
    if isinstance(item, dict):
        # qeydlər alanını düzelt
        if 'qeydlər' in item and isinstance(item['qeydlər'], list):
            item['qeydlər'] = fix_notes(item['qeydlər'])
        
        # Diğer tüm alanları işle
        for key, value in item.items():
            if isinstance(value, (dict, list)):
                process_item(value)
    
    elif isinstance(item, list):
        for element in item:
            process_item(element)

# Tüm veriyi işle
process_item(data)

# Dosyayı kaydet
with open('icd10_hierarchy.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Düzeltme tamamlandı!")
