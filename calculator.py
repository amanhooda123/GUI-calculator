import tkinter as tk

def handleclick(btnval):
    exp = strvar.get()
    if btnval == '=':
        strvar.set(eval(exp))
    elif btnval == 'C':
        strvar.set('')
    else:
        if exp == '0':
            strvar.set(btnval)
        else:
            strvar.set(exp+btnval)
    
#def handleclick8():
    #strvar.set('8')

window = tk.Tk()

strvar = tk.StringVar()
strvar.set('')


tk.Label(window , textvariable = strvar).grid(row=0, column=0, columnspan=3)
tk.Button(window, text='C',command=lambda:handleclick('C'),width=5,height=2).grid(row=0,column=3)


tk.Button(window, text='7',command=lambda:handleclick('7'),width=5,height=2).grid(row=1,column=0)
tk.Button(window, text='8',command=lambda:handleclick('8'),width =5,height=2).grid(row=1,column=1)
tk.Button(window, text='9',command=lambda:handleclick('9'),width =5,height=2).grid(row=1,column=2)
tk.Button(window, text='/',command=lambda:handleclick('/'),width =5,height=2).grid(row=1,column=3)

tk.Button(window, text='4',command=lambda:handleclick('4'),width=5,height=2).grid(row=2,column=0)
tk.Button(window, text='5',command=lambda:handleclick('5'),width =5,height=2).grid(row=2,column=1)
tk.Button(window, text='6',command=lambda:handleclick('6'),width =5,height=2).grid(row=2,column=2)
tk.Button(window, text='*',command=lambda:handleclick('*'),width =5,height=2).grid(row=2,column=3)


tk.Button(window, text='1',command=lambda:handleclick('1'),width=5,height=2).grid(row=3,column=0)
tk.Button(window, text='2',command=lambda:handleclick('2'),width =5,height=2).grid(row=3,column=1)
tk.Button(window, text='3',command=lambda:handleclick('3'),width =5,height=2).grid(row=3,column=2)
tk.Button(window, text='-',command=lambda:handleclick('-'),width =5,height=2).grid(row=3,column=3)


tk.Button(window, text='.',command=lambda:handleclick('.'),width=5,height=2).grid(row=4,column=0)
tk.Button(window, text='0',command=lambda:handleclick('0'),width =5,height=2).grid(row=4,column=1)
tk.Button(window, text='=',command=lambda:handleclick('='),width =5,height=2).grid(row=4,column=2)
tk.Button(window, text='+',command=lambda:handleclick('+'),width =5,height=2).grid(row=4,column=3)




window.mainloop()



